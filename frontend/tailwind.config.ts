/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Severity palette — used across badges, row highlights, alert banners
        p0: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
        p1: { bg: '#fff7ed', border: '#fdba74', text: '#9a3412' },
        p2: { bg: '#fefce8', border: '#fde047', text: '#854d0e' },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};