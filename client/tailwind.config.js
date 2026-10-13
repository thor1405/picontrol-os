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
        background: 'var(--color-background)',
        sidebar: 'var(--color-sidebar)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        primary: {
          DEFAULT: 'var(--color-primary, #2563EB)',
          hover: 'var(--color-primary-hover, #1D4ED8)',
          light: '#3B82F6',
        },
        secondary: {
          DEFAULT: '#0284C7',
          hover: '#0369A1',
        },
        success: {
          DEFAULT: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
        },
        critical: {
          DEFAULT: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.12)',
        },
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
