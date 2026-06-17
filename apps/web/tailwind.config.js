/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "Noto Sans Arabic", "system-ui", "sans-serif"],
      },
      colors: {
        petro: {
          DEFAULT: "#0d5c4a",
          dark: "#083c30",
          light: "#1f8a6e",
          gold: "#c9a227",
        },
      },
    },
  },
  plugins: [],
};
