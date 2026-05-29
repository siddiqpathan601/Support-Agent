/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          950: '#030014',
          900: '#0a0525',
          800: '#140c3d',
          700: '#23145c',
          600: '#39218c',
          500: '#5c39b8',
          400: '#845ef7',
          300: '#b197fc',
        }
      }
    },
  },
  plugins: [],
}
