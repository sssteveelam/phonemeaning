import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10231d",
        emerald: {
          50: "#effcf6",
          100: "#d7f7e8",
          200: "#acefd0",
          500: "#18a66a",
          600: "#128554",
          700: "#0e6a45",
          900: "#083d2a"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(16, 72, 49, .08)"
      }
    }
  },
  plugins: []
};

export default config;
