# Implementation Plan

## Overview
Fix the home (`/`) page rendering issues: ensure the header search bar is properly displayed, remove the stray "Компаниараа худалдан авалт хийх байна уу?" link row that appears detached at the bottom of the viewport, and add a smooth entrance animation to the header on the home page. All changes are scoped to the landing/header UI and preserve existing dark-mode, responsive, and accessibility behavior.

## Types
No type changes. Reuse existing `TenderOwner | null` user prop and `mn` i18n constants.

## Files
- `src/components/landing/Hero.tsx` — remove the detached link-row paragraph; keep hero search card, eyebrow, headline, subtitle, CTAs.
- `src/components/layout/Header.tsx` — ensure the desktop search input is always rendered (not conditionally hidden); add a `page-enter`-style animation class to the header bar on mount.
- `src/app/globals.css` — add a `header-enter` keyframe animation (fade + slide-down) and a `.header-enter` utility class; respect `prefers-reduced-motion`.

No files to delete or move. No config changes.

## Functions
- `Hero` (component, `src/components/landing/Hero.tsx`): remove the `<p className="mt-6 text-sm">` block (lines 193–201) containing `mn.hero.linkRow` and the company link.
- `Header` (component, `src/components/layout/Header.tsx`): verify `HeaderSearch` is rendered unconditionally in the desktop header row; add animation hook (see Classes).

## Classes
- Add a small client wrapper or modify `Header` to apply `className="header-enter"` to the top-level header element so it animates in on route mount. Use CSS animation (not framer-motion) to avoid hydration mismatches, consistent with `template.tsx`'s `page-enter` approach.

## Dependencies
None. Use existing `framer-motion` (already imported in Header) only if needed; prefer pure CSS to match `globals.css` conventions.

## Testing
- Manual: `npm run dev`, visit `/`, confirm header search bar visible, no detached bottom text, header animates in on load, dark toggle still works, responsive menu still works.
- Run `npm run typecheck` and `npm run lint` after edits.

## Implementation Order
1. Edit `Hero.tsx` to remove the link-row block.
2. Edit `globals.css` to add `header-enter` animation + utility.
3. Edit `Header.tsx` to apply the animation class and confirm search is always rendered.
4. Run `npm run dev` and verify visually; run typecheck + lint.