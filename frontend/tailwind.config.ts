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
        surface: {
          DEFAULT: "#F6FAFE",
          "container-lowest": "#FFFFFF",
          "container-low": "#EEF4FA",
          container: "#E5EFF7",
          "container-high": "#DDEAF3",
          "container-highest": "#D0E0ED",
        },
        "on-surface": {
          DEFAULT: "#0F172A",
          variant: "#475569",
        },
        secondary: {
          DEFAULT: "#2563EB",
          dim: "#0049C2",
        },
        outline: {
          DEFAULT: "#6E7D86",
          variant: "#A4B4BE",
        },
        error: "#9F403D",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
