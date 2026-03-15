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
        canvas: "#080808",
        ink: "#080808",
        accent: "#f28c28",
        accentDark: "#ffbe86",
        slate: "#c9d4db",
        moss: "#99b29f"
      },
      boxShadow: {
        card: "0 24px 60px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.04)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
