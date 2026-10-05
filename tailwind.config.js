/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./App.tsx", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e9",
        secondary: "#64748b",
        accent: "#38bdf8",
        success: "#22c55e",
        danger: "#ef4444",
        warning: "#eab308",
        surface: "#f8fafc",
      },
    },
  },
  plugins: [],
};
