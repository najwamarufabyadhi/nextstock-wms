import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#E8EAEF",
        surface: {
          base: "#FFFFFF",
          muted: "#F4F5F7",
        },
        ink: {
          primary: "#0F172A",
          secondary: "#64748B",
        },
        obsidian: "#0B101E",
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#3B82F6",
        },
      },
      borderRadius: {
        "3xl": "24px",
        "4xl": "32px",
      },
      backgroundImage: {
        "surface-tint": "linear-gradient(180deg, #E2E6F0 0%, #F5EFEA 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
