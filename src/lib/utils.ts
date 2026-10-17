/**
 * Shared client-safe utilities. No external deps beyond the fixed stack.
 */

/** Simple class name joiner (filters out falsy values). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Format a number/string as Mongolian tugrik: 2500000 -> "₮ 2,500,000". */
export function formatMNT(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (num === null || num === undefined || !Number.isFinite(num)) {
    return `₮ 0`;
  }
  return `₮ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num)}`;
}

/** Format plain integer with separators: 1200 -> "1,200". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

/**
 * Display timezone/locale are FIXED so server HTML and client render byte-
 * identical dates: the server runs UTC while the visitor may be anywhere, and
 * `date.getFullYear()`-style local accessors made the two disagree (hydration
 * warnings). Every formatted date goes through these formatters.
 */
export const DISPLAY_TIME_ZONE = 'Asia/Ulaanbaatar';

const datePartsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Split a date into {year, month, day} in Asia/Ulaanbaatar. */
function dayParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = datePartsFmt.format(date).split('-').map(Number);
  return { year, month, day };
}

/** Format a date as "2026 оны 10 сарын 9" (no ICU dependency). */
export function formatDate(input: string | Date): string {
  const date = toDate(input);
  if (!date) return '';
  const { year, month, day } = dayParts(date);
  return `${year} оны ${month} сарын ${day}`;
}

/** Format a day without the year: "10 сарын 9" (chart axes, tooltips). */
export function formatDayMonth(input: string | Date): string {
  const date = toDate(input);
  if (!date) return '';
  const { month, day } = dayParts(date);
  return `${month} сарын ${day}`;
}

/** Format a date with time: "2026 оны 10 сарын 9 14:30". */
export function formatDateTime(input: string | Date): string {
  const date = toDate(input);
  if (!date) return '';
  return `${formatDate(date)} ${timeFmt.format(date)}`;
}

/** Parse input into a valid Date or null. */
export function toDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface TimeLeft {
  expired: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Compute remaining time until a deadline. */
export function getTimeLeft(deadline: string | Date): TimeLeft {
  const date = toDate(deadline);
  const totalMs = date ? date.getTime() - Date.now() : 0;
  const expired = totalMs <= 0;
  const abs = Math.abs(totalMs);
  return {
    expired,
    totalMs,
    days: Math.floor(abs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((abs / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((abs / (1000 * 60)) % 60),
    seconds: Math.floor((abs / 1000) % 60),
  };
}

/** Format remaining milliseconds as "2 хоног 04 цаг 15 мин". */
export function formatDuration(ms: number): string {
  const abs = Math.max(0, ms);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((abs / (1000 * 60)) % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} хоног`);
  if (hours > 0 || days > 0) parts.push(`${hours} цаг`);
  parts.push(`${minutes} мин`);
  return parts.join(' ');
}

/** Pad a number to 2 digits for countdown display. */
export function pad2(value: number): string {
  return String(Math.max(0, value)).padStart(2, '0');
}

/** Debounce a function; exposes cancel() to clear the pending timer. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs = 300
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

/** Initials from a full name: "Сарантуяа Бат" -> "СБ". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Active state for nav links (exact or prefix match). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Truncate text for compact UI spots. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

/** Build a query string from a params record, skipping empty values. */
export function buildQueryString(
  params: Record<string, string | number | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
