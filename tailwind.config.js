/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,jsx,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        surface: "#111827",
        card: "#1f2937",
        primary: "#38bdf8",
        accent: "#8b5cf6",
      },
    },
  },
  plugins: [],
};
