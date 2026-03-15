import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Avenir Next"', '"Trebuchet MS"', "sans-serif"],
        sans: ['"IBM Plex Sans"', '"Avenir Next"', '"Segoe UI"', "sans-serif"]
      },
      colors: {
        canvas: "var(--canvas)",
        ink: "var(--ink)",
        accent: "var(--accent)",
        accentDark: "var(--accent-dark)",
        slate: "var(--slate)",
        moss: "var(--moss)"
      },
      boxShadow: {
        card: "var(--shadow-card)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
