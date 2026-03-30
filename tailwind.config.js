/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta CaritoFit Pro
        rose:    { DEFAULT: '#B05276', light: '#c4709a', pale: '#dbbabf' },
        pine:    { DEFAULT: '#7D0531', mid: '#9a0840', light: '#b01050' },
        pink:    { DEFAULT: '#DBBABF', mid: '#ede0e2', dark: '#cda8ad' },
        gray:    { DEFAULT: '#C1BEB9', light: '#e8e6e3' },
        gold:    { DEFAULT: '#75824D', light: '#8e9a60' },
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
