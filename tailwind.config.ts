import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input:  'var(--input)',
        ring:   'var(--ring)',

        // ── MVR Brand Tokens (Brand Refresh 2025) ──────────────────────────
        mvr: {
          // Primary navy — #1E2D40 from brand palette
          primary:         '#1E2D40',
          'primary-light': '#E8EEF4',

          // Warm sand — #CEC4B6 from brand palette
          sand:            '#CEC4B6',
          'sand-light':    '#F5F1EB',

          // Dusty steel blue — #A2B4C0 from brand palette
          steel:           '#A2B4C0',
          'steel-light':   '#EBF0F4',

          // Dark olive — #2D2A1C from brand palette
          olive:           '#2D2A1C',

          // Warm cream — page background derived from brand document
          cream:           '#F7F4F0',

          // Semantic
          success:         '#2D6A4F',
          'success-light': '#E6F4EC',
          warning:         '#B5541C',
          'warning-light': '#FDF0E6',
          danger:          '#8B2030',
          'danger-light':  '#FDEEF0',

          // Neutral — warm, not cool
          neutral:         '#EDEAE4',
        },
      },
      fontFamily: {
        sans:    ['var(--font-montserrat)', 'Montserrat', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(30, 45, 64, 0.06), 0 1px 2px rgba(30, 45, 64, 0.04)',
        'card-hover': '0 4px 12px rgba(30, 45, 64, 0.10), 0 1px 3px rgba(30, 45, 64, 0.06)',
        'panel': '0 8px 24px rgba(30, 45, 64, 0.12)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
