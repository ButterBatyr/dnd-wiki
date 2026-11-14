import typography from '@tailwindcss/typography';

const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: c('ink'),
        coal: c('coal'),
        bark: c('bark'),
        parchment: c('parchment'),
        vellum: c('vellum'),
        dust: c('dust'),
        gold: { DEFAULT: c('gold'), light: c('gold-light'), dark: c('gold-dark') },
        blood: { DEFAULT: c('blood'), light: c('blood-light') },
      },
      fontFamily: {
        display: ['Philosopher', 'Georgia', 'serif'],
        body: ['Spectral', 'Georgia', 'serif'],
      },
      typography: {
        parchment: {
          css: {
            '--tw-prose-body': 'rgb(var(--c-parchment))',
            '--tw-prose-headings': 'rgb(var(--c-gold-light))',
            '--tw-prose-lead': 'rgb(var(--c-vellum))',
            '--tw-prose-links': 'rgb(var(--c-gold-light))',
            '--tw-prose-bold': 'rgb(var(--c-parchment))',
            '--tw-prose-counters': 'rgb(var(--c-gold))',
            '--tw-prose-bullets': 'rgb(var(--c-gold))',
            '--tw-prose-hr': 'rgb(var(--c-gold) / 0.3)',
            '--tw-prose-quotes': 'rgb(var(--c-vellum))',
            '--tw-prose-quote-borders': 'rgb(var(--c-gold-dark))',
            '--tw-prose-captions': 'rgb(var(--c-dust))',
            '--tw-prose-code': 'rgb(var(--c-gold-light))',
            '--tw-prose-pre-code': 'rgb(var(--c-parchment))',
            '--tw-prose-pre-bg': 'rgb(var(--c-coal))',
            '--tw-prose-th-borders': 'rgb(var(--c-gold) / 0.4)',
            '--tw-prose-td-borders': 'rgb(var(--c-gold) / 0.2)',
          },
        },
      },
    },
  },
  plugins: [typography],
};
