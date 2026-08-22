/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8edf5',
          100: '#d1dceb',
          200: '#a3b9d7',
          300: '#7596c3',
          400: '#4773af',
          500: '#1a365d',
          600: '#152b4a',
          700: '#102038',
          800: '#0a1525',
          900: '#050b13',
        },
        gold: {
          50: '#fbf3e6',
          100: '#f7e8cc',
          200: '#efd199',
          300: '#e7ba66',
          400: '#dfa333',
          500: '#d69e2e',
          600: '#b88527',
          700: '#9a6d20',
          800: '#7c5519',
          900: '#5e3d12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}