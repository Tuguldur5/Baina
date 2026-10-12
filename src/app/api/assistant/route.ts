import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  KNOWLEDGE,
  SUGGESTIONS,
  entriesByIds,
  knowledgeAsPrompt,
  searchKnowledge,
} from '@/lib/assistant/knowledge';
import { mn } from '@/lib/i18n/mn';

/**
 * Support assistant endpoint.
 *
 * Two brains, one contract:
 *   1. an LLM, used when a key is configured (any OpenAI-compatible endpoint),
 *      primed with the platform's own rules from src/lib/assistant/knowledge.ts;
 *   2. that same knowledge base, used when no key is configured or the model
 *      call fails for any reason (no network, bad key, timeout, 429...).
 *
 * So the widget is never dead: it degrades to precise, code-accurate answers
 * instead of an error. Rate limiting for /api/* is handled in src/middleware.ts.
 */
export const dynamic = 'force-dynamic';

const API_KEY = process.env.ASSISTANT_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
const BASE_URL = (
  process.env.ASSISTANT_BASE_URL ?? 'https://api.openai.com/v1'
).replace(/\/+$/, '');
const MODEL = process.env.ASSISTANT_MODEL ?? 'gpt-4o-mini';
const MODEL_TIMEOUT_MS = 15_000;

const bodySchema = z.object({
  message: z.string().trim().min(1).max(600),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .max(10)
    .optional(),
});

interface LiveFacts {
  openTenders: number;
  totalTenders: number;
}

/**
 * Real, current numbers so the assistant never guesses a count. Read through the
 * anon client, so RLS applies exactly as it does for the visitor.
 */
async function getLiveFacts(): Promise<LiveFacts | null> {
  try {
    const supabase = createClient();
    const { count: openTenders } = await supabase
      .from('public_tenders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gt('deadline', new Date().toISOString());

    const { count: totalTenders } = await supabase
      .from('public_tenders')
      .select('id', { count: 'exact', head: true });

    return { openTenders: openTenders ?? 0, totalTenders: totalTenders ?? 0 };
  } catch {
    return null;
  }
}

function systemPrompt(facts: LiveFacts | null): string {
  const numbers = facts
    ? `Одоогийн бодит тоо: нээлттэй тендер ${facts.openTenders}, нийт тендер ${facts.totalTenders}.`
    : 'Одоогийн тоог мэдэх боломжгүй байна — тоо асуувал тодорхой хариулахгүй байна.';

  return [
    'Чи «Тендер байна» (tender.mn) платформын туслах. Зөвхөн монгол хэлээр, товч, хүндэтгэлтэй хариулна.',
    'Платформын дүрэм, хязгаарын талаар ЗӨВХӨН доорх мэдээллийн санг ашигла. Таамаглахгүй, шинэ дүрэм зохиохгүй.',
    'Хэрэв асуулт доорх мэдээлэлд байхгүй бол тодорхой хэлж, info@tender.mn хаяг руу чиглүүл.',
    'Бусдын тендер, санал, хувийн мэдээллийг хэзээ ч хэлэхгүй. Саналын тоо зэрэг нийтэд нээлттэй мэдээллийг л хэлнэ.',
    'Хариулт нь хамгийн ихдээ 120 үг. Алхмуудыг жагсаах бол "- " тэмдэгтэй мөр ашиглана. Холбоосын хаягийг (/tenders, /dashboard гэх мэт) бичнэ.',
    numbers,
    '--- ПЛАТФОРМЫН МЭДЭЭЛЛИЙН САН ---',
    knowledgeAsPrompt(),
  ].join('\n');
}

/** One model call; returns null on ANY failure so the caller can fall back. */
async function askModel(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  facts: LiveFacts | null
): Promise<string | null> {
  if (!API_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt(facts) },
          ...history.slice(-6),
          { role: 'user', content: message },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Chips shown under an answer. */
function suggestionQuestions(extra: string[] = []): string[] {
  const defaults = entriesByIds(SUGGESTIONS).map((entry) => entry.question);
  return [...new Set([...extra, ...defaults])].slice(0, 4);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: mn.errors.genericText }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: mn.errors.genericText }, { status: 400 });
  }

  const { message, history = [] } = parsed.data;
  const facts = await getLiveFacts();
  const match = searchKnowledge(message);

  // "Одоо хэдэн тендер байна?" — answer from the database, never from a guess.
  if (match.asksForLiveCount && facts) {
    return NextResponse.json({
      reply: `Одоогоор ${facts.openTenders} тендер нээлттэй байна (нийт ${facts.totalTenders} тендер бүртгэгдсэн). Нээлттэй тендерүүдийн жагсаалтыг «Тендерүүд» хуудаснаас шүүж үзэх боломжтой.`,
      source: 'knowledge',
      link: { href: '/tenders', label: mn.tenders.title },
      suggestions: suggestionQuestions(['Хугацаа дууссан тендерт санал илгээж болох уу?']),
    });
  }

  const modelReply = await askModel(message, history, facts);
  if (modelReply) {
    return NextResponse.json({
      reply: modelReply,
      source: 'llm',
      link: match.entry?.link ?? null,
      suggestions: suggestionQuestions(
        match.related.map((entry) => entry.question)
      ),
    });
  }

  // Knowledge brain (no key configured, or the model call failed).
  const entry = match.entry;
  return NextResponse.json({
    reply: entry ? entry.answer : mn.assistant.fallback,
    source: 'knowledge',
    link: entry?.link ?? null,
    suggestions: suggestionQuestions(
      (entry ? match.related : KNOWLEDGE.slice(0, 3)).map((item) => item.question)
    ),
  });
}
