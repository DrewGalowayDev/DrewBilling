/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensures Tailwind scans all relevant files
  ],
  theme: {
    extend: {}, // Customize your theme here
  },
  plugins: [],
};
