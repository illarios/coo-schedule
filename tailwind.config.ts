import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "coo-yellow": "#FFD800",
        "coo-black": "#0A0A0A",
        "coo-red": "#E63946",
        "coo-sky": "#7DD3FC",
        "coo-paper": "#FFFBEA",
      },
      fontFamily: {
        archivo: ["'Archivo Black'", "sans-serif"],
        dm: ["'DM Sans'", "sans-serif"],
        marker: ["'Permanent Marker'", "cursive"],
      },
      boxShadow: {
        brutal: "4px 4px 0 #0A0A0A",
        "brutal-sm": "2px 2px 0 #0A0A0A",
        "brutal-lg": "6px 6px 0 #0A0A0A",
        "brutal-yellow": "4px 4px 0 #FFD800",
      },
      maxWidth: {
        phone: "430px",
      },
      borderWidth: {
        "3": "3px",
      },
    },
  },
  plugins: [],
};

export default config;
