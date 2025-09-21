/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neonBlue: "#00f0ff",
        darkBlack: "#0a0a0f",
      },
      backgroundImage: {
        "rubik-pattern": "radial-gradient(circle at 1px 1px, #1a1a1a 1px, transparent 0)",
      },
      backgroundSize: {
        "rubik": "40px 40px", // gives rubik cube like small checks
      },
      boxShadow: {
        neon: "0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 40px #00f0ff",
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%": { textShadow: "0 0 5px #00f0ff, 0 0 10px #00f0ff" },
          "100%": { textShadow: "0 0 20px #00f0ff, 0 0 40px #00f0ff" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
}
