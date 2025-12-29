/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tennis: {
          green: "#4CAF50",
          blue: "#2196F3",
          clay: "#FF5722",
          ball: "#E1FF00",
        },
      },
    },
  },
  plugins: [],
}
