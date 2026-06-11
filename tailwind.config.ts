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
        background: "#FBF6EE",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#241E33",
          light: "#6B6478",
        },
        primary: {
          50: "#F0EEFE",
          100: "#E0DCFD",
          200: "#C2B9FB",
          300: "#A396F8",
          400: "#8A7AF5",
          500: "#6C5CE7",
          600: "#5645D9",
          700: "#4534B8",
          800: "#352871",
          900: "#241C4D",
        },
        accent: {
          50: "#FFF3EC",
          100: "#FFE3D2",
          200: "#FFC4A3",
          300: "#FFA374",
          400: "#FF8A50",
          500: "#FF7A33",
          600: "#F2611A",
          700: "#C94C12",
        },
        success: {
          100: "#DCFCE7",
          500: "#22C55E",
          600: "#16A34A",
        },
        danger: {
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 16px -4px rgba(36, 30, 51, 0.08)",
        card: "0 4px 24px -8px rgba(108, 92, 231, 0.18)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float-up": {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-2.5rem)", opacity: "0" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(255, 122, 51, 0.45)" },
          "70%": { boxShadow: "0 0 0 10px rgba(255, 122, 51, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255, 122, 51, 0)" },
        },
        "check-pop": {
          "0%": { transform: "scale(0)" },
          "70%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "float-up": "float-up 1.1s ease-out forwards",
        wiggle: "wiggle 0.4s ease-in-out",
        "pulse-ring": "pulse-ring 2s infinite",
        "check-pop": "check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
