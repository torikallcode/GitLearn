/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608afa',
          500: '#3b66f6',
          600: '#2547eb',
          700: '#1d35d8',
          800: '#1e2faf',
          900: '#1e2d8a',
        },
        ink: {
          50: '#f6f7f9',
          100: '#ebedf1',
          200: '#d4d8e0',
          300: '#aeb5c3',
          400: '#828ca0',
          500: '#636e85',
          600: '#4e576c',
          700: '#404757',
          800: '#373c49',
          900: '#22252e',
          950: '#14161c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'fade-up': 'fade-up .25s ease-out' },
    },
  },
  plugins: [],
}
