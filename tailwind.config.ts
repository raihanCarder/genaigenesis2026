import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
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
        canvas: "#f5f0e8",
        ink: "#1e1b18",
        accent: "#dd6b20",
        accentDark: "#8c3b1c",
        slate: "#3b4b57",
        moss: "#54705d"
      },
      boxShadow: {
        card: "0 20px 45px rgba(30, 27, 24, 0.12)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
