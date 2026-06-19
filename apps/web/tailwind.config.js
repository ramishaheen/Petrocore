/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "Noto Sans Arabic", "system-ui", "sans-serif"],
      },
      colors: {
        // Petroleum green — primary brand scale.
        petro: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#1f8a6e",
          500: "#0d5c4a",
          600: "#0a4a3b",
          700: "#083c30",
          800: "#062e25",
          900: "#04201a",
          DEFAULT: "#0d5c4a",
          dark: "#083c30",
          light: "#1f8a6e",
          gold: "#c9a227",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#475569",
          muted: "#94a3b8",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)",
        lift: "0 8px 30px rgba(8,60,48,.12)",
        glow: "0 0 0 1px rgba(13,92,74,.08), 0 10px 40px rgba(13,92,74,.14)",
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.25rem" },
      backgroundImage: {
        "petro-mesh":
          "radial-gradient(at 0% 0%, rgba(31,138,110,.20) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(201,162,39,.14) 0, transparent 50%)",
        "petro-grad": "linear-gradient(135deg, #083c30 0%, #0d5c4a 60%, #1f8a6e 100%)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in .3s ease both",
        "slide-up": "slide-up .35s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};
