/** @type {import('postcss-load-config').Config} */
// PostCSS config: only Tailwind needed; no autoprefixer (Next.js handles it).
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
