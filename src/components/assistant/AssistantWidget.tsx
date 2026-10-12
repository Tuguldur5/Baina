'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Bot, MessageCircle, Send, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mn } from '@/lib/i18n/mn';

type Role = 'user' | 'assistant';

interface ChatLink {
  href: string;
  label: string;
}

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  link?: ChatLink | null;
  suggestions?: string[];
}

interface ApiReply {
  reply: string;
  source: 'llm' | 'knowledge';
  link: ChatLink | null;
  suggestions: string[];
}

const STORAGE_KEY = 'mn-tender-assistant';
const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  text: mn.assistant.greeting,
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The assistant, floating in the bottom-right corner of every page.
 *
 * Behaviour worth knowing:
 *   - the conversation survives navigation (sessionStorage) but is cleared when
 *     the tab closes — no server-side history, no stored personal data;
 *   - pending replies show a typing indicator, and the send button stays blocked
 *     until the answer arrives, so nobody fires two questions at once;
 *   - if /api/assistant is unreachable the widget says so in the thread instead
 *     of failing silently.
 *
 * z-[55]: above the header (z-40) and drawer (z-50), below modals (z-[60]).
 */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore the thread of this tab (and drop anything malformed).
  useEffect(() => {
    setHydrated(true);
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
    } catch {
      /* ignore a corrupt entry */
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage full / disabled — the chat still works in memory */
    }
  }, [messages, hydrated]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || pending) return;

      const history = messages
        .filter((message) => message.id !== 'greeting')
        .slice(-6)
        .map((message) => ({ role: message.role, content: message.text }));

      setMessages((current) => [
        ...current,
        { id: newId(), role: 'user', text: question },
      ]);
      setInput('');
      setPending(true);

      try {
        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: question, history }),
        });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as ApiReply;
        setMessages((current) => [
          ...current,
          {
            id: newId(),
            role: 'assistant',
            text: data.reply,
            link: data.link,
            suggestions: data.suggestions,
          },
        ]);
      } catch {
        setMessages((current) => [
          ...current,
          { id: newId(), role: 'assistant', text: mn.assistant.error },
        ]);
      } finally {
        setPending(false);
      }
    },
    [messages, pending]
  );

  // Only the newest answer carries chips, so the thread stays quiet.
  const lastMessage = messages[messages.length - 1];
  const chips =
    lastMessage?.role === 'assistant' ? lastMessage.suggestions ?? [] : [];

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? mn.assistant.close : mn.assistant.launch}
        aria-expanded={open}
        aria-controls="assistant-panel"
        className={cn(
          'fixed bottom-4 right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-navy shadow-card-hover ring-1 ring-black/5 transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:bottom-5 sm:right-5',
          open && 'bg-navy text-white hover:bg-navy'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'chat'}
            initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, rotate: 30 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            )}
          </motion.span>
        </AnimatePresence>
        {!open && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-accent-500 ring-2 ring-bg"
          />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.section
            id="assistant-panel"
            role="dialog"
            aria-label={mn.assistant.title}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 right-3 z-[55] flex h-[min(70vh,32rem)] w-[min(calc(100vw-1.5rem),23rem)] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card-hover sm:bottom-24 sm:right-5"
          >
            {/* Header */}
            <header
              className="flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: 'rgb(var(--color-navy))' }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-navy">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {mn.assistant.title}
                </p>
                <p className="truncate text-xs text-white/60">
                  {mn.assistant.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMessages([GREETING])}
                aria-label={mn.assistant.clear}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={mn.assistant.close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            {/* Thread */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              <ul className="space-y-3" aria-live="polite">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-6',
                        message.role === 'user'
                          ? 'rounded-br-md bg-primary-500 text-navy'
                          : 'rounded-bl-md bg-surface-2 text-text'
                      )}
                    >
                      {message.text}
                      {message.link && (
                        <Link
                          href={message.link.href}
                          onClick={() => setOpen(false)}
                          className="mt-2 flex items-center gap-1 text-xs font-semibold text-info-600 underline-offset-2 hover:underline dark:text-info-300"
                        >
                          {message.link.label}
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}

                {pending && (
                  <li className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-3">
                      <span className="sr-only">{mn.assistant.thinking}</span>
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          aria-hidden="true"
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                          style={{ animationDelay: `${dot * 120}ms` }}
                        />
                      ))}
                    </div>
                  </li>
                )}
              </ul>

              {/* Suggestion chips under the newest answer */}
              {!pending && chips.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    {mn.assistant.suggestionsLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => void send(chip)}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-xs font-medium text-muted transition-colors hover:border-primary-300 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:border-primary-800 dark:hover:text-primary-300"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
              className="border-t border-border bg-surface px-3 py-3"
            >
              <div className="flex items-end gap-2">
                <label htmlFor="assistant-input" className="sr-only">
                  {mn.assistant.placeholder}
                </label>
                <textarea
                  id="assistant-input"
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder={mn.assistant.placeholder}
                  maxLength={600}
                  className="max-h-24 min-h-tap flex-1 resize-none rounded-2xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={pending || input.trim().length === 0}
                  aria-label={mn.assistant.send}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-navy transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted">
                {mn.assistant.disclaimer}
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
