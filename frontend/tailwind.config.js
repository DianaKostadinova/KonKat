/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E8593C',
        surface: '#1a1a1a',
        border: '#2a2a2a',
      }
    },
  },
  plugins: [],
}
