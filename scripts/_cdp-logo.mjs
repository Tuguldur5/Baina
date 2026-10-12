/**
 * Verification harness (temporary).
 *
 * Reads the ACTUAL geometry the browser paints for the logo mark in the built
 * app — not what the source claims. Checks that:
 *   1. the mark is real text (so the glyph is the font's Cyrillic «б», not a
 *      hand-drawn approximation),
 *   2. the two glyphs + period sit optically centred inside the 48×48 tile,
 *   3. the abbreviation actually spells «бн.» (code points, not pixels).
 */
const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.BASE_URL || 'http://localhost:3000';

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
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: BASE });
await new Promise((resolve) => setTimeout(resolve, 3500));

const report = await evaluate(`(async () => {
  await document.fonts.ready;
  const text = document.querySelector('svg text');
  if (!text) return { error: 'no <text> node in any logo svg' };

  const svg = text.ownerSVGElement;
  const tile = svg.querySelector('rect');
  const box = text.getBBox();
  const tileBox = tile.getBBox();

  // Ink box of the same string in the SAME font the page actually resolved,
  // measured on canvas so ascent/descent are glyph extents, not font metrics.
  const ctx = document.createElement('canvas').getContext('2d');
  const computed = getComputedStyle(text);
  const size = parseFloat(computed.fontSize);
  const weight = computed.fontWeight;
  const family = computed.fontFamily;
  ctx.font = weight + ' ' + size + 'px ' + family;
  const m = ctx.measureText(text.textContent);

  return {
    characters: [...text.textContent].map(c => c + ' (U+' + c.codePointAt(0).toString(16).toUpperCase() + ')'),
    tagName: text.tagName.toLowerCase(),
    fontFamily: family,
    fontWeight: weight,
    fontSize: size,
    fontLoaded: document.fonts.check(weight + ' ' + size + 'px ' + family),
    // The rendered glyph box, in the 48x48 tile coordinate system.
    bbox: { x: +box.x.toFixed(2), y: +box.y.toFixed(2), w: +box.width.toFixed(2), h: +box.height.toFixed(2) },
    ink: { ascent: +m.actualBoundingBoxAscent.toFixed(2), descent: +m.actualBoundingBoxDescent.toFixed(2), width: +m.width.toFixed(2) },
    tile: { x: tileBox.x, y: tileBox.y, w: tileBox.width, h: tileBox.height },
    // Where the painted glyphs actually start/end: baseline is the y attribute.
    baselineY: +text.getAttribute('y'),
  };
})()`);

console.log(JSON.stringify(report, null, 1));

// Optically-centred check against the tile inner box (3..45 on both axes).
if (report && report.bbox && report.ink) {
  const inner = { min: 3, max: 45 };
  const textLeft = report.bbox.x;
  const textRight = report.bbox.x + report.bbox.w;
  const leftGap = +(textLeft - inner.min).toFixed(2);
  const rightGap = +(inner.max - textRight).toFixed(2);
  // Ascent above baseline is the top of the ink; the period sits on the baseline.
  const top = +(report.baselineY - report.ink.ascent).toFixed(2);
  const bottom = +(report.baselineY + report.ink.descent).toFixed(2);
  console.log(
    JSON.stringify(
      {
        leftGap,
        rightGap,
        horizontalBalance: +(leftGap - rightGap).toFixed(2),
        topGap: +(top - inner.min).toFixed(2),
        bottomGap: +(inner.max - bottom).toFixed(2),
        verticalBalance: +((top - inner.min) - (inner.max - bottom)).toFixed(2),
        inkWidth: report.ink.width,
      },
      null,
      1
    )
  );
}

ws.close();
