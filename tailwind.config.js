/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: "#a855f7",
          pink: "#ec4899",
          violet: "#8b5cf6",
          lavender: "#c084fc",
          dark: "#0a0a0f",
          darker: "#0d0b1a",
        },
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
