import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#130f0b',
        coal: '#1d1712',
        bark: '#2a2119',
        parchment: '#eadfc4',
        vellum: '#cdbf9c',
        dust: '#9a8c6e',
        gold: { DEFAULT: '#c9a24b', light: '#e3c377', dark: '#8f6f2a' },
        blood: { DEFAULT: '#9b3a24', light: '#d2674d' },
      },
      fontFamily: {
        display: ['Philosopher', 'Georgia', 'serif'],
        body: ['Spectral', 'Georgia', 'serif'],
      },
      typography: {
        parchment: {
          css: {
            '--tw-prose-body': '#eadfc4',
            '--tw-prose-headings': '#e3c377',
            '--tw-prose-lead': '#cdbf9c',
            '--tw-prose-links': '#e3c377',
            '--tw-prose-bold': '#f6edd3',
            '--tw-prose-counters': '#c9a24b',
            '--tw-prose-bullets': '#c9a24b',
            '--tw-prose-hr': '#4a3b28',
            '--tw-prose-quotes': '#cdbf9c',
            '--tw-prose-quote-borders': '#8f6f2a',
            '--tw-prose-captions': '#9a8c6e',
            '--tw-prose-code': '#e3c377',
            '--tw-prose-pre-code': '#eadfc4',
            '--tw-prose-pre-bg': '#1d1712',
            '--tw-prose-th-borders': '#6b5530',
            '--tw-prose-td-borders': '#4a3b28',
          },
        },
      },
    },
  },
  plugins: [typography],
};
