/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  extend: {
    colors: {
      'logoGreen': '#1E6439',
      'logoYellow': '#bb8e3f',
      'logoRed': '#af2b3d'
            }
          }
         },
  plugins: [],
}