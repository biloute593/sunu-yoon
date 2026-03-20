/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{tsx,ts}",
    "./components/**/*.{tsx,ts}",
    "./contexts/**/*.{tsx,ts}",
    "./services/**/*.ts",
    "./utils/**/*.ts"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
