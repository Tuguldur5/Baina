/**
 * Root page transition: fade + slide-up 16px, 0.25s ease-out.
 *
 * Implemented as a CSS animation (not framer-motion) on purpose:
 * the SSR HTML already contains the final visible state, so the page body can
 * never get stuck at opacity:0 when JavaScript is slow or fails to hydrate.
 * `prefers-reduced-motion` collapses the duration globally (see globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
