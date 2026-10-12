/**
 * Built-in knowledge base behind the support assistant.
 *
 * The assistant has two brains. When an LLM API key is configured it uses the
 * model; otherwise — and whenever the model call fails — it answers from this
 * table. The table is not a stub: it is also the ground truth pasted into the
 * model's system prompt, so both brains give the same, code-accurate answers
 * about the platform (limits, statuses, who can see what).
 *
 * Everything here mirrors the real implementation:
 *   - description limits      → src/lib/constants.ts
 *   - proposal minimums       → src/lib/constants.ts (PROPOSAL_*)
 *   - statuses                → src/lib/constants.ts (TENDER_STATUSES / PROPOSAL_STATUSES)
 *   - two-tier confidentiality→ db/rls.sql, db/storage.sql
 *   - contact address         → src/lib/i18n/mn.ts (static.privacy)
 */

export interface KnowledgeEntry {
  id: string;
  /** Shown as a suggestion chip. */
  question: string;
  /** Terms that select this entry; matched word-wise, prefix-tolerant. */
  keywords: string[];
  answer: string;
  /** In-app page offered together with the answer. */
  link?: { href: string; label: string };
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'post-tender',
    question: 'Тендер хэрхэн зарлах вэ?',
    keywords: ['тендер', 'зарлах', 'зарлахуй', 'үүсгэх', 'нэмэх', 'зарлагч', 'постлох'],
    answer:
      'Тендер зарлахын тулд нэвтэрсний дараа header-ийн «+ Тендер зарлах» товч эсвэл нүүр хуудасны «Тендер зарлах» товчийг дарна.\n' +
      '1-р алхам — нийтэд харагдах мэдээлэл: гарчиг (5–150 тэмдэгт), товч тайлбар (20–2000), ангилал, бүс нутаг, төсөв, хугацаа.\n' +
      '2-р алхам — зөвхөн шалгарсан оролцогчид нээгдэх нууц мэдээлэл: дэлгэрэнгүй тайлбар, техникийн шаардлага, хаяг, холбоо барих мэдээлэл, хавсралт файлууд.\n' +
      'Хугацаа ирээдүйн огноо байх ёстой. Зарлагдсаны дараа санал ирэх бүрд та мэдэгдэл авна.',
    link: { href: '/tenders/new', label: 'Тендер зарлах' },
  },
  {
    id: 'submit-proposal',
    question: 'Санал хэрхэн илгээх вэ?',
    keywords: ['санал', 'илгээх', 'оролцох', 'өрсөлдөх', 'үнэ', 'төсөв', 'bid'],
    answer:
      'Нээлттэй тендерийн хуудаснаас «Санал илгээх» товчийг дарна (нэвтэрсэн байх шаардлагатай).\n' +
      'Саналд дараах зүйлс орно: үнийн санал, гүйцэтгэх хугацаа (өдрөөр), тайлбар (50–3000 тэмдэгт) болон дор хаяж 1 баримт бичиг — үнийн санал, тусгай зөвшөөрөл, туршлагын тодорхойлолт гэх мэт (хамгийн ихдээ 3 файл, файл тус бүр 10MB хүртэл).\n' +
      'Хугацаа дууссан эсвэл хаагдсан тендерт санал илгээх боломжгүй. Зарлагч өөрийн зарласан тендер дээр санал илгээх боломжгүй.',
    link: { href: '/tenders', label: 'Тендерүүд үзэх' },
  },
  {
    id: 'confidential',
    question: 'Нууц мэдээлэл хэзээ нээгдэх вэ?',
    keywords: ['нууц', 'мэдээлэл', 'дэлгэрэнгүй', 'хаяг', 'холбоо', 'шат', 'нээгдэх', 'шаардлага'],
    answer:
      'Платформ хоёр шатлалтай ажилладаг.\n' +
      '1-р шат (бүгдэд): гарчиг, товч тайлбар, ангилал, төсөв, бүс нутаг, хугацаа, саналын тоо, зарлагчийн нэрийг дарсан хэлбэрээр (жишээ нь «Б***»).\n' +
      '2-р шат (нууц): дэлгэрэнгүй тайлбар, техникийн шаардлага, хаяг, холбоо барих мэдээлэл, хавсралт файлууд — зөвхөн тендерийн эзэн болон шалгаруулалтад шилжсэн (эсвэл ялагчаар сонгогдсон) оролцогчид нээгдэнэ.\n' +
      'Таны санал шалгаруулагдмагц нууц мэдээлэл автоматаар нээгдэж, мэдэгдэл ирнэ.',
    link: { href: '/about', label: 'Платформын тухай' },
  },
  {
    id: 'who-sees-bid',
    question: 'Миний саналыг хэн харах вэ?',
    keywords: ['саналаа', 'хэн', 'харах', 'бусдын', 'нуух', 'хамгаалах', 'илчлэх'],
    answer:
      'Таны санал (үнэ, тайлбар, хавсралт файлууд) зөвхөн танд болон тухайн тендерийн зарлагчид харагдана. Бусад оролцогчид харахгүй.\n' +
      'Өөр оролцогчдын саналын тоо л нийтэд харагдана; хэн, хэдэн төгрөгөөр санал болгосон нь харагдахгүй. Саналын файлууд нь тусдаа, хувийн (private) санд хадгалагдана.',
  },
  {
    id: 'statuses',
    question: 'Төлвүүд ямар утгатай вэ?',
    keywords: ['төлөв', 'статус', 'нээлттэй', 'хаагдсан', 'шалгарсан', 'хүлээгдэж', 'татгалзсан', 'хүлээн'],
    answer:
      'Тендерийн төлөв: «Нээлттэй» — санал хүлээж байна; «Хаагдсан» — шинэ санал авахгүй; «Шалгарсан» — ялагч тодорч, тендер дууссан.\n' +
      'Саналын төлөв: «Хүлээгдэж буй» — хараахан шийдэгдээгүй; «Шалгарсан» — зарлагч сонгож, нууц мэдээлэл нээгдсэн; «Хүлээн авсан» — ялагч; «Татгалзсан» — сонгогдоогүй.',
  },
  {
    id: 'award',
    question: 'Ялагчийг хэрхэн сонгох вэ?',
    keywords: ['ялагч', 'сонгох', 'шалгаруулах', 'хүлээн', 'award', 'шийдвэр'],
    answer:
      'Зарлагч «Миний тендерүүд» хэсгээс тендэрээ нээгээд ирсэн саналуудыг харна.\n' +
      '• «Шалгаруулах» — тухайн оролцогчид таны нууц мэдээлэл нээгдэнэ, санал нь «Шалгарсан» төлөвт шилжинэ.\n' +
      '• «Хүлээн авах» — ялагчийг сонгоно. Сонгосон санал хүлээн авагдмагц бусад саналууд автоматаар «Татгалзсан» төлөвт шилжиж, тендер «Шалгарсан» болно.',
    link: { href: '/dashboard?tab=tenders', label: 'Миний тендерүүд' },
  },
  {
    id: 'edit-withdraw',
    question: 'Саналаа засах эсвэл цуцлах уу?',
    keywords: ['засах', 'цуцлах', 'буцаах', 'өөрчлөх', 'withdraw', 'edit'],
    answer:
      'Тендерийн хуудас дээрх «Миний санал» хэсгээс саналаа засах эсвэл цуцлах боломжтой — гэхдээ зөвхөн санал «Хүлээгдэж буй» төлөвтэй, тендер «Нээлттэй», хугацаа дуусаагүй байх үед.\n' +
      'Шалгарсан, хүлээн авсан эсвэл татгалзсан саналыг өөрчлөх боломжгүй.',
  },
  {
    id: 'close-tender',
    question: 'Тендерийг хэрхэн хаах вэ?',
    keywords: ['хаах', 'хаагдах', 'дуусгах', 'close'],
    answer:
      'Өөрийн тендерийн хуудаснаас «Тендерийг хаах» товчийг дарж, баталгаажуулна. Хаасны дараа шинэ санал ирэхгүй бөгөөд оролцогчид мэдэгдэл очно.\n' +
      'Хаагдсан тендер жагсаалтад «Хаагдсан» төлөвтэй харагдана.',
  },
  {
    id: 'deadline',
    question: 'Хугацаа дууссан тендерт санал илгээж болох уу?',
    keywords: ['хугацаа', 'дуусах', 'дууссан', 'expired', 'deadline', 'хоног'],
    answer:
      'Болохгүй. Хугацаа дууссан тендерт шинэ санал илгээх, саналаа засах боломжгүй — энэ шалгалт сервер дээр болон мэдээллийн сангийн түвшинд хийгддэг.\n' +
      'Жагсаалт болон тендерийн карт дээр үлдсэн хугацаа бодит цагаар харагдаж, хугацаа дуусмагц «Хугацаа дууссан» гэж солигдоно.',
  },
  {
    id: 'account-types',
    question: 'Хувь хүн эсвэл компани хэрхэн бүртгүүлэх вэ?',
    keywords: ['бүртгэл', 'бүртгүүлэх', 'компани', 'хувь', 'хүн', 'регистр', 'нэвтрэх', 'аккаунт'],
    answer:
      'Хоёр төрлийн бүртгэл байна: «Хувь хүн» — иргэний нэрээр, «Компани» — компанийн нэрээр (компанийн нэр заавал бөглөнө).\n' +
      'Хоёулаа тендер зарлах, санал илгээх бүрэн эрхтэй. Ялгаа нь зөвхөн профайл болон жагсаалтад харагдах шошго («Хувь хүн» / «Компани»).',
    link: { href: '/auth/register', label: 'Бүртгүүлэх' },
  },
  {
    id: 'search',
    question: 'Тендер хэрхэн хайх, шүүх вэ?',
    keywords: ['хайх', 'хайлт', 'шүүх', 'шүүлтүүр', 'ангилал', 'бүс', 'нутаг', 'эрэмбэ', 'search', 'filter'],
    answer:
      '«Тендерүүд» хуудсанд дараах шүүлтүүрүүд байна: түлхүүр үгийн хайлт (гарчиг болон тайлбарт), ангилал, бүс нутаг, төлөв, зарлагчийн төрөл (хувь хүн / компани), төсвийн доод ба дээд хязгаар.\n' +
      'Эрэмбэлэх: шинээр нь, хугацаа дуусах, төсөв өндөр, төсөв бага. Нүүр хуудсан дээрх хайлтын талбар мөн шууд энэ хуудас руу хайлт дамжуулна.',
    link: { href: '/tenders', label: 'Тендерүүд' },
  },
  {
    id: 'notifications',
    question: 'Мэдэгдэл хаана ирэх вэ?',
    keywords: ['мэдэгдэл', 'notification', 'хонх', 'bell', 'сонордуулах'],
    answer:
      'Header-ийн хонхны дүрсэн дээр хамгийн сүүлийн мэдэгдлүүд харагдана (уншаагүй бол улаан цэгтэй). Бүрэн жагсаалт: Шинжилгээний самбар → «Мэдэгдэл» таб.\n' +
      'Мэдэгдэл дараах үед үүснэ: таны тендерт санал ирэх, таны санал шалгарах/хүлээн авагдах/татгалзагдах, тендер хаагдах.',
    link: { href: '/dashboard?tab=notifications', label: 'Мэдэгдлүүд' },
  },
  {
    id: 'attachments',
    question: 'Ямар файл хавсаргах вэ?',
    keywords: ['файл', 'хавсралт', 'pdf', 'docx', 'xlsx', 'хэмжээ', 'mb', 'зураг', 'бичиг'],
    answer:
      'Зөвшөөрөгдөх төрөл: PDF, DOC/DOCX, XLS/XLSX, PNG, JPEG. Файл тус бүр 10MB хүртэл.\n' +
      'Тендер зарлах үед хамгийн ихдээ 5 файл, санал илгээхэд хамгийн ихдээ 3 файл хавсаргана. Саналд дор хаяж 1 баримт бичиг заавал байх ёстой.',
  },
  {
    id: 'security',
    question: 'Мэдээлэл аюулгүй юу?',
    keywords: ['аюулгүй', 'хамгаалалт', 'нууцлал', 'security', 'rls', 'эрх', 'хакер'],
    answer:
      'Хандах эрхийг зөвхөн интерфэйс дээр нуух бус, мэдээллийн сангийн түвшинд (Row Level Security) хатуу хязгаарладаг:\n' +
      '• нууц мэдээллийг зөвхөн тендерийн эзэн болон шалгарсан оролцогч уншина;\n' +
      '• оролцогчийн санал, түүний файлууд зөвхөн тухайн оролцогч болон тендерийн эзэнд харагдана;\n' +
      '• саналын файлууд хувийн санд, гарын үсэгтэй түр холбоосоор татагдана.',
    link: { href: '/privacy', label: 'Нууцлалын бодлого' },
  },
  {
    id: 'fees',
    question: 'Хураамж, төлбөр байгаа юу?',
    keywords: ['төлбөр', 'хураамж', 'үнэ', 'fee', 'commission', 'шинэ', 'төлөх'],
    answer:
      'Платформын хураамж, төлбөрийн нөхцөл нь гэрээний дагуу өөрчлөгддөг тул тодорхой мэдээллийг info@tender.mn хаягаар лавлана уу.\n' +
      'Тендер зарлах, санал илгээх үйлдэл өөрөө ямар нэг нэмэлт төлбөр шаарддаггүй.',
  },
  {
    id: 'contact',
    question: 'Холбоо барих',
    keywords: ['холбоо', 'барих', 'имэйл', 'email', 'дэмжлэг', 'тусламж', 'админ', 'support'],
    answer:
      'Асуулт, санал, гомдол байвал info@tender.mn хаягаар холбогдоно уу. Профайлын мэдээлэл, бүртгэлтэй холбоотой асуудлыг мөн энэ хаягаар шийдвэрлэнэ.',
  },
  {
    id: 'about',
    question: 'Платформ гэж юу вэ?',
    keywords: ['платформ', 'тухай', 'юу', 'вэ', 'тендер', 'байна', 'сайт'],
    answer:
      '«Тендер байна» нь Монголын хувь хүн, компаниудыг шударгаар холбодог тендерийн платформ юм: нэг тал тендер зарлаж, нөгөө тал санал илгээж өрсөлдөнө.\n' +
      'Гол онцлог нь хоёр шатлалтай мэдээлэл — эхний шатанд ил тод, хоёр дахь шатанд зөвхөн шалгарсан оролцогчид нээгддэг.',
    link: { href: '/about', label: 'Бидний тухай' },
  },
];

/** Chips offered before the first question / after a miss. */
export const SUGGESTIONS = [
  'post-tender',
  'submit-proposal',
  'confidential',
  'statuses',
  'account-types',
  'award',
] as const;

/** Sentences that ask for the live count of open tenders. */
const LIVE_COUNT_KEYWORDS = ['хэдэн', 'хэд', 'тоо', 'статистик', 'одоо'];

const STOP_WORDS = new Set([
  'ба', 'бол', 'вэ', 'бэ', 'уу', 'үү', 'байна', 'яаж', 'ямар', 'гэж', 'юу',
  'нь', 'миний', 'та', 'би', 'энэ', 'тэр', 'хамт', 'болон', 'аа', 'оо', 'ээ',
]);

/** Split text into comparable lowercase words (Cyrillic + Latin + digits). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Score one entry against the query.
 *
 * Mongolian is agglutinative — «санал», «саналаа», «саналд» are the same word
 * with different endings — so a token matching the START of a keyword (or vice
 * versa, for long enough words) counts, just less than an exact hit. Without
 * this, every inflected question would fall through to "I don't know".
 */
function scoreEntry(entry: KnowledgeEntry, tokens: string[]): number {
  let score = 0;
  for (const keyword of entry.keywords) {
    for (const token of tokens) {
      if (token === keyword) {
        score += 4;
      } else if (keyword.length >= 4 && token.startsWith(keyword)) {
        score += 3;
      } else if (token.length >= 5 && keyword.startsWith(token)) {
        score += 2;
      } else if (token.length >= 6 && token.includes(keyword.slice(0, 5))) {
        score += 1;
      }
    }
  }
  return score;
}

export interface KnowledgeMatch {
  entry: KnowledgeEntry | null;
  /** Other entries the query also touched — offered as follow-ups. */
  related: KnowledgeEntry[];
  /** True when the question is about today's numbers (handled by the caller). */
  asksForLiveCount: boolean;
}

export function searchKnowledge(query: string): KnowledgeMatch {
  const tokens = tokenize(query);
  const scored = KNOWLEDGE.map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const asksForLiveCount =
    tokens.filter((token) => LIVE_COUNT_KEYWORDS.includes(token)).length > 0 &&
    tokens.some((token) => token.startsWith('тендер'));

  return {
    entry: scored[0]?.score >= 3 ? scored[0].entry : null,
    related: scored.slice(1, 4).map((row) => row.entry),
    asksForLiveCount,
  };
}

export function entriesByIds(ids: readonly string[]): KnowledgeEntry[] {
  return ids
    .map((id) => KNOWLEDGE.find((entry) => entry.id === id))
    .filter((entry): entry is KnowledgeEntry => Boolean(entry));
}

/** Compact text version of the table, used to prime the language model. */
export function knowledgeAsPrompt(): string {
  return KNOWLEDGE.map(
    (entry) => `### ${entry.question}\n${entry.answer}${entry.link ? `\nХолбоос: ${entry.link.href}` : ''}`
  ).join('\n\n');
}
