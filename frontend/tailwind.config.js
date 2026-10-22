/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#0a0e18",
        "surface-container-low": "#171b26",
        "surface-container": "#1c1f2a",
        "surface-container-high": "#262a35",
        "surface-container-highest": "#313540",
        "primary": "#c0c1ff",
        "primary-container": "#8083ff",
        "on-primary-container": "#0d0096",
        "secondary": "#4cd7f6",
        "outline": "#908fa0",
        "outline-variant": "#464554",
        "background": "#0f131d",
        "on-surface": "#dfe2f1",
        "on-surface-variant": "#c7c4d7",
      },
      fontFamily: {
        "body-base": ["Inter", "sans-serif"],
        "code-inline": ["JetBrains Mono", "monospace"],
        "label-caps": ["Plus Jakarta Sans", "sans-serif"],
        "label-interactive": ["Plus Jakarta Sans", "sans-serif"],
      }
    },
  },
  plugins: [],
};