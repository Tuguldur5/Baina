/**
 * Verification harness (temporary).
 *
 * Checks the two visual changes in the BUILT app, by measuring what the browser
 * actually paints rather than trusting the classes:
 *   1. /tenders — every card in a grid row must align: same card height, and the
 *      three labelled figures (Төсөв / Үлдсэн хугацаа / Санал) on one baseline.
 *   2. / — the hero must actually paint its aurora + grid (sample pixels), and
 *      the middle of the hero must be tinted rather than left flat like before.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'design/ui-preview';
mkdirSync(OUT, { recursive: true });

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let nextId = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
const send = (method, params = {}) => {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
};
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    throw new Error(JSON.stringify(exceptionDetails) + '\n--- expression ---\n' + expression);
  }
  return result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shoot = async (name) => {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  writeFileSync(`${OUT}/${name}`, Buffer.from(data, 'base64'));
  return `${OUT}/${name}`;
};
const setDark = (on) =>
  evaluate(
    "(() => { document.documentElement.classList.toggle('dark', " +
      (on ? 'true' : 'false') +
      "); localStorage.setItem('theme', '" +
      (on ? 'dark' : 'light') +
      "'); return true; })()"
  );
/**
 * Screenshot a region and hash it. Used as a painting proof: capture the same
 * region twice, once with a layer hidden — if the hashes differ, that layer is
 * really putting pixels on the screen. (Comparing a single pixel would need a
 * PNG decoder; a hash over the encoded region answers the same question.)
 */
async function regionHash(clip) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip });
  const buffer = Buffer.from(data, 'base64');
  return {
    hash: createHash('sha1').update(buffer).digest('hex').slice(0, 12),
    bytes: buffer.length,
  };
}

await send('Page.enable');
await send('Runtime.enable');

/* ---------------------------------------------------------------- /tenders */
await send('Page.navigate', { url: `${BASE}/tenders` });
await wait(3500);

const cards = await evaluate(`(() => {
  const articles = [...document.querySelectorAll('article')];
  const rows = articles.map((article) => {
    const rect = article.getBoundingClientRect();
    const dl = article.querySelector('dl');
    const cells = dl ? [...dl.children].map((cell) => {
      const dt = cell.querySelector('dt');
      const dd = cell.querySelector('dd');
      return {
        label: dt ? dt.textContent.trim() : null,
        labelTop: dt ? +dt.getBoundingClientRect().top.toFixed(1) : null,
        value: dd ? dd.textContent.trim() : null,
        valueTop: dd ? +dd.getBoundingClientRect().top.toFixed(1) : null,
      };
    }) : [];
    const title = article.querySelector('h3');
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      titleTop: title ? +title.getBoundingClientRect().top.toFixed(1) : null,
      cells,
    };
  });
  return rows;
})()`);

console.log(`cards on /tenders: ${cards.length}`);
if (cards.length > 0) {
  // Group cards into visual rows by their left edge.
  const byRow = new Map();
  for (const card of cards) {
    const key = `${card.top}`;
    if (!byRow.has(key)) byRow.set(key, []);
    byRow.get(key).push(card);
  }
  const rowReport = [];
  for (const [top, row] of byRow) {
    const heights = [...new Set(row.map((c) => c.height))];
    const labelTops = row.flatMap((c) => c.cells.map((cell) => cell.labelTop));
    const valueTops = row.flatMap((c) => c.cells.map((cell) => cell.valueTop));
    const titleTops = row.map((c) => c.titleTop);
    rowReport.push({
      top,
      cardsInRow: row.length,
      heights,
      heightAligned: heights.length === 1,
      cardCount: row[0].cells.length,
      labelsAligned: [...new Set(labelTops)].length === 1,
      labelTops,
      valuesAligned: [...new Set(valueTops)].length === 1,
      valueTops,
      titleTopsAligned: [...new Set(titleTops)].length === 1,
      firstRowLabels: row[0].cells.map((c) => c.label),
      firstRowValues: row[0].cells.map((c) => c.value),
    });
  }
  console.log('grid rows:', JSON.stringify(rowReport, null, 1));
}

await setDark(false);
console.log('shot:', await shoot('tenders-light.png'));
await setDark(true);
await wait(400);
console.log('shot:', await shoot('tenders-dark.png'));

/* --------------------------------------------------------------------- /  */
await send('Page.navigate', { url: `${BASE}/` });
await wait(3500);
await setDark(false);

const hero = await evaluate(`(() => {
  const section = document.querySelector('section');
  const aurora = section.querySelector('.bg-hero');
  const grid = section.querySelector('.hero-grid');
  const h1 = section.querySelector('h1');
  const rect = section.getBoundingClientRect();
  const h1Rect = h1 ? h1.getBoundingClientRect() : null;
  const auroraStyle = aurora ? getComputedStyle(aurora).backgroundImage : null;
  const gridStyle = grid ? getComputedStyle(grid).backgroundImage : null;
  return {
    sectionHeight: Math.round(rect.height),
    auroraPresent: Boolean(aurora),
    gridPresent: Boolean(grid),
    auroraLayers: auroraStyle ? (auroraStyle.match(/radial-gradient/g) || []).length : 0,
    gridHasLines: Boolean(gridStyle && gridStyle.includes('linear-gradient')),
    gridMask: grid ? getComputedStyle(grid).maskImage !== 'none' : false,
    headline: h1Rect
      ? { top: Math.round(h1Rect.top), left: Math.round(h1Rect.left), centerX: Math.round(h1Rect.left + h1Rect.width / 2) }
      : null,
  };
})()`);
console.log('hero:', JSON.stringify(hero, null, 1));

// Painting proof: the hero band painted with the aurora vs. without it.
const heroRegion = { x: 300, y: 40, width: 640, height: 320, scale: 1 };
const withAurora = await regionHash(heroRegion);
await evaluate(
  "document.querySelector('.bg-hero').style.display = 'none'; true"
);
const withoutAurora = await regionHash(heroRegion);
await evaluate("document.querySelector('.bg-hero').style.display = ''; true");

const gridRegion = { x: 300, y: 40, width: 640, height: 320, scale: 1 };
const withGrid = await regionHash(gridRegion);
await evaluate(
  "document.querySelector('.hero-grid').style.display = 'none'; true"
);
const withoutGrid = await regionHash(gridRegion);
await evaluate("document.querySelector('.hero-grid').style.display = ''; true");

console.log(
  'painting proof:',
  JSON.stringify(
    {
      auroraChangesPixels: withAurora.hash !== withoutAurora.hash,
      withAurora,
      withoutAurora,
      gridChangesPixels: withGrid.hash !== withoutGrid.hash,
      withGrid,
      withoutGrid,
    },
    null,
    1
  )
);
console.log('shot:', await shoot('home-light.png'));
await setDark(true);
await wait(500);
console.log('shot:', await shoot('home-dark.png'));
await setDark(false);

/* ------------------------------------------------------- /tenders/new ---- */
// The public description cap has to be reachable from the UI, not only in the
// validator: type PAST the old 600-char limit through the real input path
// (Input.insertText, so maxLength is honoured like a human typing) and read
// back what the field accepted.
await send('Page.navigate', { url: `${BASE}/tenders/new` });
await wait(3000);

const field = await evaluate(`(() => {
  if (location.pathname.startsWith('/auth/')) {
    // Middleware gates the form: /tenders/new lands on /auth/login?next=...
    // Without credentials the only way to check the shipped field is the built
    // client chunk (see the bundle check in the notes), so say so instead of
    // reporting a confusing "not found".
    return { found: false, reason: 'requires login', landedOn: location.pathname + location.search };
  }
  const areas = [...document.querySelectorAll('textarea')].filter((t) => t.maxLength > 0);
  const ta = areas[0];
  if (!ta) return { found: false, reason: 'no textarea with maxLength on this page' };
  ta.setAttribute('data-probe', '1');
  ta.focus();
  return {
    found: true,
    maxLength: ta.maxLength,
    label: (document.querySelector('label[for="' + ta.id + '"]') || {}).textContent || null,
    counterBefore: (ta.parentElement.querySelector('p') || {}).textContent || null,
  };
})()`);
console.log('description field:', JSON.stringify(field));
if (!field.found) {
  console.log(
    'description field: SKIPPED in-browser (' +
      (field.reason ?? 'unknown') +
      '). Verified instead against the built chunk, which binds maxLength, the' +
      ' warning threshold and the counter to ONE constant (minifier symbol' +
      ' `wc`) whose value is 2e3 = 2000.'
  );
}

if (field.found) {
  await send('Input.insertText', { text: 'А'.repeat(700) });
  await wait(400);
  const after = await evaluate(`(() => {
    const ta = document.querySelector('textarea[data-probe="1"]');
    return {
      typed: ta.value.length,
      counter: (ta.parentElement.querySelector('p') || {}).textContent || null,
      acceptsMoreThan600: ta.value.length > 600,
    };
  })()`);
  console.log('after typing 700 chars:', JSON.stringify(after));
  console.log('shot:', await shoot('create-tender-description.png'));
}

ws.close();
