/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        border: 'var(--border)',
        surface: {
          DEFAULT: 'var(--surface)',
          950: 'var(--bg)',
          900: 'var(--surface)',
          850: 'var(--surface-elevated)',
          800: 'var(--surface-muted)',
          700: 'var(--border)',
          600: 'var(--muted)',
        },
        brand: {
          50: 'var(--accent-tint)',
          100: 'var(--accent-tint)',
          200: 'var(--accent)',
          300: 'var(--accent)',
          400: 'var(--accent)',
          500: 'var(--accent)',
          600: 'var(--accent)',
          700: 'var(--accent)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          tint: 'var(--accent-tint)',
          foreground: 'var(--on-accent)',
        },
        alert: {
          DEFAULT: 'var(--alert)',
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
