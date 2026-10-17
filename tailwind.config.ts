import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Design tokens.
 * All colors resolve through CSS variables defined in src/app/globals.css
 * (light theme on :root, dark theme on .dark) so components never hardcode hex.
 * RGB channel values are stored without the `rgb()` wrapper so Tailwind can
 * inject opacity via <alpha-value>.
 */
const rgb = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // primary: warm orange / amber (brand CTA)
        primary: {
          50: rgb('--color-primary-50'),
          100: rgb('--color-primary-100'),
          200: rgb('--color-primary-200'),
          300: rgb('--color-primary-300'),
          400: rgb('--color-primary-400'),
          500: rgb('--color-primary-500'),
          600: rgb('--color-primary-600'),
          700: rgb('--color-primary-700'),
          800: rgb('--color-primary-800'),
          900: rgb('--color-primary-900'),
          950: rgb('--color-primary-950'),
        },
        // accent: green — "Хувь хүн" (individual) accent + success chips
        accent: {
          50: rgb('--color-accent-50'),
          100: rgb('--color-accent-100'),
          200: rgb('--color-accent-200'),
          300: rgb('--color-accent-300'),
          400: rgb('--color-accent-400'),
          500: rgb('--color-accent-500'),
          600: rgb('--color-accent-600'),
          700: rgb('--color-accent-700'),
          800: rgb('--color-accent-800'),
          900: rgb('--color-accent-900'),
          950: rgb('--color-accent-950'),
        },
        // info: blue — "Компани" accent + small chips/links
        info: {
          50: rgb('--color-info-50'),
          100: rgb('--color-info-100'),
          200: rgb('--color-info-200'),
          300: rgb('--color-info-300'),
          400: rgb('--color-info-400'),
          500: rgb('--color-info-500'),
          600: rgb('--color-info-600'),
          700: rgb('--color-info-700'),
          800: rgb('--color-info-800'),
          900: rgb('--color-info-900'),
          950: rgb('--color-info-950'),
        },
        // danger: red
        danger: {
          50: rgb('--color-danger-50'),
          100: rgb('--color-danger-100'),
          200: rgb('--color-danger-200'),
          300: rgb('--color-danger-300'),
          400: rgb('--color-danger-400'),
          500: rgb('--color-danger-500'),
          600: rgb('--color-danger-600'),
          700: rgb('--color-danger-700'),
          800: rgb('--color-danger-800'),
          900: rgb('--color-danger-900'),
          950: rgb('--color-danger-950'),
        },
        // warning: amber
        warning: {
          50: rgb('--color-warning-50'),
          100: rgb('--color-warning-100'),
          200: rgb('--color-warning-200'),
          300: rgb('--color-warning-300'),
          400: rgb('--color-warning-400'),
          500: rgb('--color-warning-500'),
          600: rgb('--color-warning-600'),
          700: rgb('--color-warning-700'),
          800: rgb('--color-warning-800'),
          900: rgb('--color-warning-900'),
          950: rgb('--color-warning-950'),
        },
        // semantic surfaces / text
        bg: rgb('--color-bg'),
        surface: rgb('--color-surface'),
        'surface-2': rgb('--color-surface-2'),
        border: rgb('--color-border'),
        text: rgb('--color-text'),
        muted: rgb('--color-muted'),
        ring: rgb('--color-ring'),
        // navy ink (header bar, headings, dark panels)
        navy: {
          DEFAULT: rgb('--color-navy'),
          soft: rgb('--color-navy-soft'),
        },
        // brand verticals: one accent token per "…байна" vertical
        brand: {
          tender: rgb('--brand-tender'),
          classified: rgb('--brand-classified'),
          jobs: rgb('--brand-jobs'),
        },
        warm: rgb('--color-warm'),
        // Admin panel (StarAdmin palette) — scoped to `.admin-theme` in
        // globals.css. Never used on the public site.
        a: {
          bg: rgb('--a-bg'),
          panel: rgb('--a-panel'),
          border: rgb('--a-border'),
          ink: rgb('--a-ink'),
          muted: rgb('--a-muted'),
          faint: rgb('--a-faint'),
          primary: rgb('--a-primary'),
          'primary-tint': rgb('--a-primary-tint'),
          info: rgb('--a-info'),
          success: rgb('--a-success'),
          warning: rgb('--a-warning'),
          danger: rgb('--a-danger'),
          'info-tint': rgb('--a-info-tint'),
          'success-tint': rgb('--a-success-tint'),
          'warning-tint': rgb('--a-warning-tint'),
          'danger-tint': rgb('--a-danger-tint'),
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        // Admin panel radii (spec: rows/chips 10px, cards 16px, main panel 20px)
        a: '10px',
        'a-card': '16px',
        'a-panel': '20px',
      },
      boxShadow: {
        // Admin: very soft shadows only (spec A1)
        'a-soft': '0 1px 2px rgba(16, 24, 40, 0.04)',
        'a-card': '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.10)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.08)',
        'card-hover':
          '0 2px 4px 0 rgb(15 23 42 / 0.06), 0 16px 40px -12px rgb(15 23 42 / 0.16)',
        glass: '0 8px 32px -8px rgb(15 23 42 / 0.12)',
      },
      backgroundImage: {
        'primary-gradient': 'var(--gradient-primary)',
        'accent-gradient': 'var(--gradient-accent)',
        'hero-blob': 'var(--gradient-blob)',
        'warm-card': 'var(--gradient-warm-card)',
        glass: 'var(--gradient-glass)',
        mesh: 'var(--gradient-mesh)',
      },
      spacing: {
        header: '4rem', // fixed header height (64px)
        tap: '44px', // minimum touch target
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease-out',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
