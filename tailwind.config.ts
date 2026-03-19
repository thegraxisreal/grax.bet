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
        "bg-primary": "#0f1923",
        "bg-secondary": "#152232",
        "bg-card": "#1a2b3c",
        "bg-sidebar": "#0c1520",
        "accent-green": "#00e676",
        "accent-gold": "#f0b429",
        "text-primary": "#e8f0fe",
        "text-secondary": "#8fa8c8",
        "text-muted": "#4a6480",
        "border-color": "#1e3450",
      },
    },
  },
  plugins: [],
};
export default config;
