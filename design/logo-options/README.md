# Logo options — “байна” brand family

The product is **Тендер байна** today, but the brand is really the word **“байна”**
(“there is / available”). The same core will power **Зар байна** (classifieds) and
**Ажил байна** (jobs) and more later. So the system is: **a constant core
(“байна”) + one changing first word + one changing accent token.** Everything below
is built on that rule — the mark geometry never changes between verticals, only its
color does.

Open the three spec sheets (`option-a.svg` / `option-b.svg` / `option-c.svg`, or the
matching `.png` previews). Each sheet shows the `Тендер байна` lockup, the
`Зар байна` and `Ажил байна` family variants, a 16 → 64px mark ramp, and the color
tokens — on a light **and** a dark background.

Regenerate everything with `node design/logo-options/generate.mjs`.
Regenerate the mark size ramp (light + dark) with `node design/logo-options/mark-preview.mjs`
— it embeds the shipped `src/app/icon.svg` verbatim, so it can never drift from the app.

---

## Option A — “Байна тэмдэг” (abbreviation tile) ✅ chosen

- **Concept:** a modern app-tile in the vertical's accent color holding **«бн.»** — the
  written abbreviation of *байна* (the same shorthand Mongolians use in a sentence:
  “тендер **бн.**”). The tile spells the constant core itself instead of hinting at it.
- **Why it fits “байна”:** “байна” means *exists / is available*; the abbreviation **is**
  the word, so the mark reads in any language context and the period makes it look like
  the tick of a finished sentence — a small “done / here” signal.
- **The letters are SVG *text*, not drawn paths.** The font supplies the glyph, so the
  Cyrillic **б** keeps its real shape — bowl at the BOTTOM, stem rising on the right and
  hooking left. Every hand-drawn attempt at this letter collapsed into a Latin **P**
  (bowl hung off the top of a stem), which is the exact opposite construction; taking
  the glyph from the font is the only reliable way. The same reasoning now governs
  `src/app/icon.svg`, `Logo.tsx` and `generate.mjs`.
- **Color logic:** the tile IS the vertical token (orange `#F59E0B` for Тендер, teal
  `#14B8A6` for Зар, violet `#8B5CF6` for Ажил); the `бн.` is constant white. The
  wordmark puts *“байна”* in extra-bold in the vertical color and the first word in
  neutral ink/white, so the family is visible even in a text-only lockup.
- **At small sizes:** measured in Chrome at 48×48, `бн.` is 32.57 wide inside the 42px
  tile (4.56 / 4.87 side gaps, 12.7 / 12.3 top-bottom gaps) — optically centred, and it
  still resolves at 16px. See `bn-preview.html` (generated straight from the shipped
  `src/app/icon.svg`) for the full size ramp on light and dark.

## Option B — “Сүлжээ” (network)

- **Concept:** three connected nodes in a triangle — a poster on top, bidders below,
  joined by lines.
- **Why it fits “байна”:** it shows the two-sided marketplace “being there” for each
  other rather than the word itself; the accent node is the vertical.
- **Color logic:** one accent node (+ accent lines in a same-hue tint) changes per
  vertical; the rest stays navy. Reads as a network/graph, so it is the least
  “tender” and the most generic of the three at a glance.

## Option C — “Давхарга” (layered offers)

- **Concept:** two stacked rounded cards; the front card carries the vertical color
  and a white check.
- **Why it fits “байна”:** “there are many offers available, and this one is yours” —
  the stack stands in for a growing list of listings.
- **Color logic:** the front card is the one variable token, the back card is fixed
  navy. Strong “marketplace” feel, but the check-in-a-card is a common shape and is
  weaker than a letterform for brand recall at 16px.

---

## The pick: **Option A — “Байна тэмдэг”**

**Why:** it is the only direction that puts the brand's *constant core* on screen as
characters, so the same «бн.» tile reads as Тендер, Зар, Ажил and any future vertical
with nothing but a color change — a true one-config-entry family. It is legible in
Cyrillic (the glyph comes from the font, so it can never drift into a Latin letter),
stays crisp from 16px (favicon) to 64px, and the accent tile ties it to the existing
orange CTA UI while the white letters keep it readable on the navy header. The
wordmark's “**байна** in extra-bold vertical color” then does the heavy lifting for the
family story in text contexts.

*Runner-up:* **Option C** — the strongest of the two abstract marks for a pure
“marketplace” feel. If you prefer a symbol without a letter, say so and I can swap the
mark inside `Logo.tsx` while keeping the same tokens, config and wordmark.
