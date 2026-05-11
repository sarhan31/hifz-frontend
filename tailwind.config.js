/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-teal': '#022c22', // Very dark green background
        'forest-green': '#064e3b', // Primary accent green
        'mint-green': '#dcfce7', // Light green for text contrast
        'gold-accent': '#fbbf24', // Elegant gold for numbers/highlights
        'slate-dark': '#0f172a', // Secondary dark background
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        amiri: ['Amiri', 'serif'],
        quran: ['"Amiri Quran"', 'serif'],
      },
      backgroundImage: {
        'quran-gradient': 'linear-gradient(180deg, #022c22 0%, #052e16 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
      },
    },
  },
  plugins: [],
}