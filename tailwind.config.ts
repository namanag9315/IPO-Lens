import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f8fafc",
        lens: {
          green: "#0f9f6e",
          teal: "#0f766e",
          indigo: "#4f46e5",
          amber: "#f59e0b",
          rose: "#e11d48",
        },
      },
      boxShadow: {
        soft: "0 18px 40px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
