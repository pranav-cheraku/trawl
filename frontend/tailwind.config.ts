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
          DEFAULT: "#FAFAFA",
          "container-lowest": "#FFFFFF",
          "container-low": "#F5F5F5",
          container: "#EEEEEE",
          "container-high": "#E5E5E5",
          "container-highest": "#D4D4D4",
        },
        "on-surface": {
          DEFAULT: "#171717",
          variant: "#525252",
        },
        secondary: {
          DEFAULT: "#4CB572",
          dim: "#398856",
        },
        outline: {
          DEFAULT: "#737373",
          variant: "#A3A3A3",
        },
        error: "#D97706",
        priority: {
          critical: "#DC2626",
          "critical-text": "#DC2626",
          high: "#EAB308",
          "high-text": "#A16207",
          medium: "#22C55E",
          "medium-text": "#15803D",
          low: "#A3A3A3",
          "low-text": "#737373",
        },
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
