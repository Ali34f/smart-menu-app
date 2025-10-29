/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#27AE60',
        danger: '#E74C3C',
        info: '#3498DB',
      }
    },
  },
  plugins: [],
}