/**
 * Brand exploration generator.
 *
 * Emits three clearly different logo directions as real SVG spec sheets into
 * design/logo-options/. Each sheet shows the "Тендер байна" lockup plus the
 * "Зар байна" and "Ажил байна" family variants on a LIGHT and a DARK
 * background, a mark-only size ramp (64/32/24/16px) and the vertical colors.
 *
 * Run: node design/logo-options/generate.mjs
 *
 * The point of this file is to prove the family logic: the mark geometry is a
 * CONSTANT and only ONE token (the vertical accent color) changes between
 * verticals. That is exactly how src/lib/brand.ts + Logo.tsx are wired.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ tokens */

const FONT =
  "Inter, 'Segoe UI', 'Noto Sans', system-ui, -apple-system, Arial, sans-serif";

const NAVY = '#0F172A';
const NAVY_SOFT = '#1E293B';
const INK = '#0F172A';
const PAPER = '#FFFFFF';
const PAPER_SOFT = '#F8F8F7';

/** One entry per vertical = one entry per brand. */
const VERTICALS = [
  { key: 'tender', prefix: 'Тендер', accent: '#F59E0B', role: 'Тендер (core)' },
  { key: 'classified', prefix: 'Зар', accent: '#14B8A6', role: 'Зар (classifieds)' },
  { key: 'jobs', prefix: 'Ажил', accent: '#8B5CF6', role: 'Ажил (jobs)' },
];

const CORE = 'байна';

/* ------------------------------------------------------------------- marks */
/* Every mark is drawn on a 48x48 grid and rendered with the accent color as
 * the only variable. Geometry never changes between verticals.            */

/**
 * Option A — "Байна тэмдэг": accent app-tile with the real Cyrillic «бн.».
 * The letters come from the font (text), never from hand-drawn paths, so the
 * mark can't drift into a Latin «P.».
 */
const markA = (accent) => `
    <rect x="3" y="3" width="42" height="42" rx="13" fill="${accent}"/>
    <text x="23.5" y="31.7" text-anchor="middle" font-family="${FONT}" font-size="21"
          font-weight="800" letter-spacing="-0.6" fill="#FFFFFF">бн.</text>`;

/** Option B — "Сүлжээ": three connected nodes (the marketplace network). */
const markB = (accent) => `
    <path d="M24 13 L13 34 L35 34 Z" fill="none" stroke="${NAVY}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="13" r="5.6" fill="${accent}"/>
    <circle cx="13" cy="34" r="4.6" fill="${NAVY}"/>
    <circle cx="35" cy="34" r="4.6" fill="${NAVY}"/>`;

/** Option C — "Давхарга": stacked offer cards, front card is the vertical. */
const markC = (accent) => `
    <rect x="4" y="10" width="30" height="30" rx="9" fill="${NAVY}"/>
    <rect x="15" y="15" width="29" height="29" rx="9" fill="${accent}"/>
    <path d="M22.5 29.5 L26.8 33.8 L33.8 26.5" fill="none" stroke="#FFFFFF" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"/>`;

const MARKS = { a: markA, b: markB, c: markC };

const OPTIONS = [
  {
    id: 'a',
    letter: 'A',
    name: 'Байна тэмдэг',
    concept: 'Accent app-tile with a geometric Б and a navy “presence” dot.',
  },
  {
    id: 'b',
    letter: 'B',
    name: 'Сүлжээ',
    concept: 'Three connected nodes — poster and bidders meeting in one network.',
  },
  {
    id: 'c',
    letter: 'C',
    name: 'Давхарга',
    concept: 'Stacked offer cards; the front card carries the vertical color.',
  },
];

/* ---------------------------------------------------------------- helpers */

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Render a mark at (x, y) with a given pixel size. */
function mark(id, accent, x, y, size) {
  return `<g transform="translate(${x} ${y}) scale(${(size / 48).toFixed(4)})">${MARKS[id](accent)}</g>`;
}

/**
 * Full lockup: mark + "Prefix байна".
 * variant "light" = sits on a light surface (prefix in ink),
 * variant "dark"  = sits on a dark surface (prefix in white).
 */
function lockup(id, vertical, x, y, variant, scale = 1) {
  const prefixFill = variant === 'dark' ? '#FFFFFF' : INK;
  const size = 46 * scale;
  const fontSize = 30 * scale;
  const baseline = y + size * 0.68;
  return `
    <g>
      ${mark(id, vertical.accent, x, y, size)}
      <text x="${x + size + 15 * scale}" y="${baseline}" font-family="${FONT}"
            font-size="${fontSize}" letter-spacing="-0.4">
        <tspan font-weight="600" fill="${prefixFill}">${esc(vertical.prefix)} </tspan><tspan font-weight="800" fill="${vertical.accent}">${esc(CORE)}</tspan>
      </text>
    </g>`;
}

/* -------------------------------------------------------------- sheet body */

function buildSheet(option) {
  const W = 1240;
  const H = 1220;
  const PAD = 48;
  const innerW = W - PAD * 2;
  const parts = [];

  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER_SOFT}"/>`);

  /* Title ------------------------------------------------------------- */
  parts.push(
    `<text x="${PAD}" y="74" font-family="${FONT}" font-size="15" font-weight="700" letter-spacing="2" fill="#F59E0B">OPTION ${option.letter}</text>`,
    `<text x="${PAD}" y="118" font-family="${FONT}" font-size="38" font-weight="800" letter-spacing="-0.8" fill="${INK}">${esc(option.name)}</text>`,
    `<text x="${PAD}" y="150" font-family="${FONT}" font-size="17" fill="#64748B">${esc(option.concept)}</text>`
  );

  /* Light panel ------------------------------------------------------- */
  const lightY = 190;
  const lightH = 372;
  parts.push(
    `<rect x="${PAD}" y="${lightY}" width="${innerW}" height="${lightH}" rx="26" fill="${PAPER}" stroke="#E5E7EB"/>`,
    `<text x="${PAD + 34}" y="${lightY + 46}" font-family="${FONT}" font-size="14" font-weight="700" letter-spacing="1.4" fill="#94A3B8">LIGHT CONTEXT · ЦАГААН ДЭВСГЭР</text>`
  );
  VERTICALS.forEach((v, i) => {
    parts.push(lockup(option.id, v, PAD + 34, lightY + 74 + i * 84, 'light', 1));
  });
  // mark-only size ramp on light
  parts.push(
    `<text x="${PAD + innerW - 34}" y="${lightY + 46}" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="600" fill="#94A3B8">16 · 24 · 32 · 64 px</text>`
  );
  [64, 32, 24, 16].forEach((size, i) => {
    const x = PAD + innerW - 34 - [0, 74, 118, 158][i] - size;
    const y = lightY + 80;
    parts.push(mark(option.id, VERTICALS[0].accent, x, y, size));
  });
  parts.push(
    `<line x1="${PAD + 34}" y1="${lightY + 330}" x2="${PAD + innerW - 34}" y2="${lightY + 330}" stroke="#F1F5F9" stroke-width="1.5"/>`
  );

  /* Dark panel -------------------------------------------------------- */
  const darkY = lightY + lightH + 26;
  const darkH = 348;
  parts.push(
    `<rect x="${PAD}" y="${darkY}" width="${innerW}" height="${darkH}" rx="26" fill="${NAVY}"/>`,
    `<text x="${PAD + 34}" y="${darkY + 46}" font-family="${FONT}" font-size="14" font-weight="700" letter-spacing="1.4" fill="#64748B">DARK CONTEXT · ЦЭНХЭР ДЭВСГЭР (#0F172A)</text>`
  );
  VERTICALS.forEach((v, i) => {
    parts.push(lockup(option.id, v, PAD + 34, darkY + 74 + i * 84, 'dark', 1));
  });
  [64, 32, 24, 16].forEach((size, i) => {
    const x = PAD + innerW - 34 - [0, 74, 118, 158][i] - size;
    const y = darkY + 80;
    parts.push(mark(option.id, VERTICALS[0].accent, x, y, size));
  });

  /* Color row --------------------------------------------------------- */
  const colorY = darkY + darkH + 30;
  parts.push(
    `<text x="${PAD}" y="${colorY + 4}" font-family="${FONT}" font-size="14" font-weight="700" letter-spacing="1.4" fill="#94A3B8">VERTICAL TOKENS · НЭГ ТОКЕН = НЭГ САЛБАР</text>`
  );
  const chipW = (innerW - 2 * 18) / 3;
  VERTICALS.forEach((v, i) => {
    const x = PAD + i * (chipW + 18);
    const y = colorY + 22;
    parts.push(
      `<rect x="${x}" y="${y}" width="${chipW}" height="86" rx="18" fill="${PAPER}" stroke="#E5E7EB"/>`,
      `<rect x="${x + 18}" y="${y + 20}" width="46" height="46" rx="13" fill="${v.accent}"/>`,
      `<text x="${x + 80}" y="${y + 40}" font-family="${FONT}" font-size="17" font-weight="700" fill="${INK}">${esc(v.prefix)} ${esc(CORE)}</text>`,
      `<text x="${x + 80}" y="${y + 64}" font-family="${FONT}" font-size="14" fill="#64748B">${esc(v.role)} · ${esc(v.accent)}</text>`
    );
  });

  /* Footer note ------------------------------------------------------- */
  parts.push(
    `<text x="${PAD}" y="${H - 22}" font-family="${FONT}" font-size="13" fill="#94A3B8">“${esc(CORE)}” is the constant core; only the prefix word and one accent token change per vertical.</text>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${parts.join('\n')}
</svg>
`;
}

/* -------------------------------------------------------------------- main */

mkdirSync(__dirname, { recursive: true });
for (const option of OPTIONS) {
  const file = join(__dirname, `option-${option.id}.svg`);
  writeFileSync(file, buildSheet(option), 'utf8');
  // eslint-disable-next-line no-console
  console.log('wrote', file);
}
