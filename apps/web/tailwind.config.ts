import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "var(--brand)",
        branddark: "var(--brand-dark)",
        accent: "var(--accent)",
        ink: "var(--ink)",
      },
    },
  },
  plugins: [],
};

export default config;
