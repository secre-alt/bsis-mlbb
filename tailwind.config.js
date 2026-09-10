/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0a0b",
          900: "#111113",
          800: "#18181b",
          700: "#232326",
          600: "#333338",
          500: "#4a4a52",
          400: "#6a6a72",
          300: "#8a8a92",
        },
        ember: {
          500: "#FF5A1F",
          400: "#FF7A3D",
          300: "#FFA366",
        },
        rift: {
          500: "#2FD3B8",
        },
        blood: {
          500: "#E6473C",
        },
      },
      fontFamily: {
        display: ['"Heimat Mono"', "monospace"],
        body: ['"Inter"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgba(255,90,31,0.08), transparent 60%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "slide-up": {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite linear",
        "slide-up": "slide-up 0.25s ease-out",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
