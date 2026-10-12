/**
 * Mark preview sheet: embeds the SHIPPED favicon (src/app/icon.svg) at several
 * sizes on a light and a dark panel, so the mark can be eyeballed at the sizes
 * it is actually used at.
 *
 * It reads the real favicon instead of redrawing it — a hand-drawn copy is what
 * made the mark drift into a Latin «P.» in the first place.
 *
 * Run: node design/logo-options/mark-preview.mjs
 * Out: design/logo-options/bn-preview.html
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

/** The favicon file, verbatim — the single source of truth for the mark. */
const markSvg = readFileSync(join(root, 'src', 'app', 'icon.svg'), 'utf8').trim();

const SIZES = [128, 64, 48, 32, 24, 16];

/** Same file, scaled to a pixel size (viewBox stays 48x48). */
const mark = (size) =>
  markSvg.replace('<svg ', `<svg width="${size}" height="${size}" `);

const panel = (dark) => `
  <section class="panel${dark ? ' dark' : ''}">
    <p class="title">${dark ? 'DARK · #0F172A дэвсгэр' : 'LIGHT · цагаан дэвсгэр'}</p>
    <div class="row">
      ${SIZES.map(
        (size) => `<div class="cell">${mark(size)}<span class="px">${size}</span></div>`
      ).join('')}
      <span class="divider"></span>
      <div class="cell lockup">
        ${mark(34)}
        <span class="word"><b>Тендер</b><span>байна</span></span>
      </div>
    </div>
  </section>`;

const html = `<!doctype html>
<html lang="mn"><head><meta charset="utf-8">
<title>Логоны тэмдэг — «бн.»</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 26px; background: #F8F8F7; color: #0F172A;
         font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.3px; }
  p.sub { margin: 0 0 20px; max-width: 860px; font-size: 13px; line-height: 1.55; color: #64748B; }
  .panel { border: 1px solid #E5E7EB; border-radius: 20px; padding: 18px 22px; margin-bottom: 16px; background: #fff; }
  .panel.dark { background: #0F172A; border-color: #1E293B; color: #fff; }
  .title { margin: 0 0 12px; font-size: 11px; font-weight: 800; letter-spacing: 1.6px; color: #94A3B8; }
  .row { display: flex; align-items: flex-end; gap: 22px; }
  .cell { display: flex; flex-direction: column; align-items: center; gap: 7px; }
  .px { font-size: 11px; font-weight: 600; color: #94A3B8; }
  .divider { width: 1px; align-self: stretch; background: #E5E7EB; }
  .dark .divider { background: #1E293B; }
  .lockup { flex-direction: row; align-items: center; gap: 12px; }
  .word { font-size: 20px; letter-spacing: -0.4px; }
  .word b { font-weight: 600; }
  .word span { font-weight: 800; color: #F59E0B; }
</style></head><body>
<h1>Логоны тэмдэг: «бн.»</h1>
<p class="sub"><b>бн.</b> — <i>байна</i> гэдэг үгийн товчлол. Үсгүүд нь SVG <b>текст</b> тул кирилл
<b>б</b>-ийн хэлбэрийг фонт өөрөө өгнө: аяга доод талд, багана баруун талд дээш гарч зүүн тийш
эргэдэг — латин <b>P</b>-тэй яг эсрэгээрээ. Энэ хуудас нь <code>src/app/icon.svg</code>-г шууд
суулгасан тул апп-аас зөрөх боломжгүй.</p>
${panel(false)}
${panel(true)}
</body></html>
`;

writeFileSync(join(__dirname, 'bn-preview.html'), html, 'utf8');

// eslint-disable-next-line no-console
console.log('wrote design/logo-options/bn-preview.html');
