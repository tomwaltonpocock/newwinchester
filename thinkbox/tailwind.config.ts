import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1917",
        paper: "#faf9f7",
        card: "#ffffff",
        hairline: "#e7e2da",
        accent: "#0f5c4f",
        accentSoft: "#e5efec",
        amber: "#b45309",
        amberSoft: "#fdf3e3",
        rose: "#9f1239",
        roseSoft: "#fbe9ed",
        muted: "#78716c",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,25,23,0.06), 0 4px 16px rgba(28,25,23,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
