import {
  BRAND_CORE_WORD,
  BRAND_VERTICALS,
  DEFAULT_BRAND_VERTICAL,
  type BrandVerticalKey,
} from '@/lib/brand';
import { cn } from '@/lib/utils';

/**
 * Which surface the logo is placed on:
 *  - "light": light/white background → the first word renders in ink.
 *  - "dark":  navy/dark background  → the first word renders in white.
 * The mark itself (accent tile + white «бн.») is identical in both contexts,
 * so it never has to be re-colored.
 */
export type LogoVariant = 'light' | 'dark';

interface LogoProps {
  /** Which "…байна" vertical to render. */
  vertical?: BrandVerticalKey;
  /** Surface context (controls the first word's color). */
  variant?: LogoVariant;
  /** Hide the wordmark and render the mark only (still accessible). */
  showText?: boolean;
  /** Mark size in px; the wordmark scales with it. */
  size?: number;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Extra classes for the wordmark (e.g. `hidden sm:inline-flex`). */
  textClassName?: string;
}

/**
 * The constant mark: an accent app-tile holding **«бн.»** — the short form of
 * *байна*.
 *
 * The letters are RENDERED TEXT, not hand-drawn paths. Drawing Cyrillic б by
 * eye kept producing a Latin «P» (a bowl hung off the top of a stem), which is
 * the opposite of the letter: б puts its bowl at the BOTTOM and runs the stem
 * up the right side into a short leftward arm. Taking the glyph from the font
 * guarantees the real letter, and guarantees that it keeps matching the
 * wordmark next to it. Only the tile color changes per vertical.
 *
 * The baseline/`fontSize` pair is tuned for Inter's metrics (б ascends ~0.73em,
 * the period sits on the baseline) so the abbreviation is optically centred in
 * the 42×42 tile at every size.
 */
function LogoMark({ size }: { size: number }) {
  return (
    <span className="inline-flex shrink-0 transition-transform duration-300 ease-out group-hover/logo:-rotate-3 group-hover/logo:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="3" width="42" height="42" rx="13" className="fill-current" />
        <text
          x="23.5"
          y="31.7"
          textAnchor="middle"
          className="fill-white font-sans"
          fontSize="21"
          fontWeight="800"
          letterSpacing="-0.6"
        >
          бн.
        </text>
      </svg>
    </span>
  );
}

/**
 * Brand lockup: constant mark + "Prefix байна", with the constant core word
 * emphasized (extra-bold, vertical accent color) and the changing first word in
 * neutral ink/white. Renders without JS; hover animation respects reduced motion.
 */
export function Logo({
  vertical = DEFAULT_BRAND_VERTICAL,
  variant = 'light',
  showText = true,
  size = 32,
  className,
  textClassName,
}: LogoProps) {
  const brand = BRAND_VERTICALS[vertical];
  const fontSize = Math.max(12, Math.round(size * 0.5));

  return (
    <span
      className={cn('group/logo inline-flex items-center', brand.accentClass, className)}
      aria-label={showText ? undefined : brand.name}
      role={showText ? undefined : 'img'}
    >
      <LogoMark size={size} />
      {showText && (
        <span
          className={cn(
            'ml-2 whitespace-nowrap font-sans leading-none tracking-tight',
            textClassName
          )}
          style={{ fontSize }}
        >
          <span className={cn('font-semibold', variant === 'dark' ? 'text-white' : 'text-text')}>
            {brand.prefix}
          </span>{' '}
          <span className="font-extrabold">{BRAND_CORE_WORD}</span>
        </span>
      )}
    </span>
  );
}
