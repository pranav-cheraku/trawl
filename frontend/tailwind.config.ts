import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        cream: "#FDFCFA",
        ink: "#1C1917",
        "ink-light": "#44403C",
        "ink-muted": "#78716C",
        "ink-faint": "#A8A29E",
        teal: {
          DEFAULT: "#2D5F5D",
          light: "#E8F0EF",
          dark: "#1D4E4C",
        },
        border: "#E7E5E4",
      },
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
