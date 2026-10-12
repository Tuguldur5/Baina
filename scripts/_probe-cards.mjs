/**
 * Temporary probe: verify the rebuilt tender card figure panel — the countdown
 * must stay on ONE line, the budget must never be ellipsised, and every card in
 * a grid row must end up the same height. Deleted after verification.
 *
 * The page is loaded ONCE and only the viewport is resized between measurements,
 * so a responsive CSS change is measured without paying a full reload each time.
 */
const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const log = (...args) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...args);
const t0 = Date.now();

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
log('targets:', targets.map((t) => `${t.type}:${t.url}`).join(', '));
const ws = new WebSocket(page.webSocketDebuggerUrl);
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
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Runtime.enable');
log('navigating to /tenders');
await send('Page.navigate', { url: `${BASE}/tenders` });
for (let i = 0; i < 40; i++) {
  const ready = await evaluate('document.querySelectorAll("article").length');
  if (ready > 0) {
    log('cards rendered:', ready);
    break;
  }
  await wait(500);
}
await wait(1200);

const PROBE = `(() => {
  const lines = (el) => {
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    return lh ? Math.round(el.getBoundingClientRect().height / lh) : null;
  };
  return [...document.querySelectorAll('article')].map((a) => {
    const r = a.getBoundingClientRect();
    const dl = a.querySelector('dl');
    const [budget, quote] = dl ? [...dl.querySelectorAll('dd')] : [];
    const countdown = dl ? dl.querySelector('span') : null;
    return {
      top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      panelH: dl ? Math.round(dl.getBoundingClientRect().height) : null,
      countdownLines: countdown ? lines(countdown) : null,
      countdownText: countdown ? countdown.textContent.trim() : null,
      countdownClipped: countdown ? countdown.scrollWidth > countdown.clientWidth + 1 : null,
      budgetText: budget ? budget.textContent.trim() : null,
      budgetClipped: budget ? budget.scrollWidth > budget.clientWidth + 1 : null,
      sameRow: quote && budget
        ? Math.abs(quote.getBoundingClientRect().top - budget.getBoundingClientRect().top) < 2
        : null,
      labelHeights: dl ? [...dl.querySelectorAll('dt')].map((l) => Math.round(l.getBoundingClientRect().height)) : [],
      meta: (a.querySelector('dl ~ div') || { textContent: '' }).textContent.replace(/\\s+/g, ' ').trim(),
    };
  });
})()`;

const OVERFLOW = `(() => {
  const bad = [];
  for (const a of document.querySelectorAll('article')) {
    const card = a.getBoundingClientRect();
    for (const el of a.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest('[aria-hidden="true"]')) continue; // decorative glow, clipped by the card
      if (r.right > card.right + 1 || r.left < card.left - 1) {
        bad.push({ tag: el.tagName, cls: String(el.className).slice(0, 60) });
      }
    }
  }
  return bad.slice(0, 5);
})()`;

for (const width of [1440, 1100, 768, 640, 420]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(700);
  const cards = await evaluate(PROBE);
  const overflow = await evaluate(OVERFLOW);
  const rowHeights = new Map();
  for (const c of cards) {
    if (!rowHeights.has(c.top)) rowHeights.set(c.top, new Set());
    rowHeights.get(c.top).add(c.h);
  }
  const ragged = [...rowHeights.values()].filter((s) => s.size > 1).length;
  const first = cards[0] ?? {};
  console.log(`\n=== width ${width} — cards ${cards.length}, row-heights ${JSON.stringify([...rowHeights.values()].map((s) => [...s]))}`);
  console.log(JSON.stringify({
    cardH: first.h,
    panelH: first.panelH,
    budget: first.budgetText,
    budgetClipped: first.budgetClipped,
    countdown: first.countdownText,
    countdownLines: first.countdownLines,
    countdownClipped: first.countdownClipped,
    figuresOnOneLine: first.sameRow,
    labelHeights: first.labelHeights,
    meta: first.meta,
  }));
  console.log('countdown lines:', JSON.stringify(cards.map((c) => c.countdownLines)));
  console.log('clipped budget:', cards.filter((c) => c.budgetClipped).length,
    'clipped countdown:', cards.filter((c) => c.countdownClipped).length,
    'ragged rows:', ragged,
    'outside-card elements:', JSON.stringify(overflow));
}
await send('Emulation.clearDeviceMetricsOverride');
log('done');
