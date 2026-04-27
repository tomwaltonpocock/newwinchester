import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#161412",
        paper: "#fbf8f3",
        stone: {
          50: "#f6f1e8",
          100: "#ece4d4",
          200: "#dccfb4",
          300: "#c6b289",
          400: "#a78d62",
          500: "#866d49",
          600: "#6a5538",
          700: "#4f3f29",
          800: "#352b1c",
          900: "#1f1812",
        },
        accent: "#7a3d2e",
      },
      fontFamily: {
        serif: [
          "Iowan Old Style",
          "Apple Garamond",
          "Baskerville",
          "Times New Roman",
          "Droid Serif",
          "Times",
          "serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightish: "-0.012em",
      },
      maxWidth: {
        prose2: "62ch",
      },
    },
  },
  plugins: [],
};

export default config;
