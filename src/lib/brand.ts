/**
 * Brand system config.
 *
 * The brand is built on a constant core word — "байна" ("there is / available") —
 * plus a changing first word and ONE accent token per vertical:
 *   Тендер байна · Зар байна · Ажил байна · (…байна)
 *
 * Adding a new vertical is a single entry in `BRAND_VERTICALS` plus one CSS token
 * (see src/app/globals.css). No new artwork is ever required: the mark geometry is
 * constant and only the accent color changes.
 *
 * Colors resolve through CSS variables so components never hold raw hex.
 */

export const BRAND_CORE_WORD = 'байна';

export type BrandVerticalKey = 'tender' | 'classified' | 'jobs';

export interface BrandVertical {
  key: BrandVerticalKey;
  /** Mongolian first word that changes per vertical. */
  prefix: string;
  /** Full product name for this vertical, e.g. "Тендер байна". */
  name: string;
  /** Accent text/fill color class (backed by a CSS token). */
  accentClass: string;
  /** Soft accent surface class for badges/tints. */
  accentSurfaceClass: string;
}

export const BRAND_VERTICALS: Record<BrandVerticalKey, BrandVertical> = {
  tender: {
    key: 'tender',
    prefix: 'Тендер',
    name: `Тендер ${BRAND_CORE_WORD}`,
    accentClass: 'text-brand-tender',
    accentSurfaceClass: 'bg-brand-tender/10 text-brand-tender',
  },
  classified: {
    key: 'classified',
    prefix: 'Зар',
    name: `Зар ${BRAND_CORE_WORD}`,
    accentClass: 'text-brand-classified',
    accentSurfaceClass: 'bg-brand-classified/10 text-brand-classified',
  },
  jobs: {
    key: 'jobs',
    prefix: 'Ажил',
    name: `Ажил ${BRAND_CORE_WORD}`,
    accentClass: 'text-brand-jobs',
    accentSurfaceClass: 'bg-brand-jobs/10 text-brand-jobs',
  },
};

/** The vertical this product currently runs as. */
export const DEFAULT_BRAND_VERTICAL: BrandVerticalKey = 'tender';
