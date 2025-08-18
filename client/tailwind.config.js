/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  extend: {
    colors: {
      'ai-purple': '#7E5BEF',
      'ai-teal': '#2DD4BF',
            }
          }
         },
  plugins: [],
}