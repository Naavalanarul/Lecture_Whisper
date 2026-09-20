/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        hero: 'var(--radius-hero)',
        card: 'var(--radius-card)',
        subcard: 'var(--radius-subcard)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      colors: {
        bg: 'var(--bg)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        'text-subtle': 'var(--text-subtle)',
        surface: {
          DEFAULT: 'var(--surface)',
          subtle: 'var(--surface-subtle)',
          elevated: 'var(--surface-elevated)',
          muted: 'var(--surface-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          tint: 'var(--accent-tint)',
          subtle: 'var(--accent-subtle)',
          foreground: 'var(--on-accent)',
        },
        alert: {
          DEFAULT: 'var(--alert)',
          tint: 'var(--alert-tint)',
        },
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
