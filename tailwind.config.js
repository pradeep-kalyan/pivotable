/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#e6f7f7",
          100: "#ccefef",
          200: "#99dfdf",
          300: "#66cfcf",
          400: "#33bfbf",
          500: "#00afaf",
          600: "#008c8c",
          700: "#006969",
          800: "#004646",
          900: "#002323",
        },
        sand: {
          50: "#f9f7f2",
          100: "#f3efe5",
          200: "#e7dfcb",
          300: "#dbcfb1",
          400: "#cfbf97",
          500: "#c3af7d",
          600: "#9c8c64",
          700: "#75694b",
          800: "#4e4632",
          900: "#272319",
        },
      },
      fontFamily: {
        lato: ["Lato", "sans-serif"],
        audio: ["Audiowide", "sans-serif"],
      },
    },
  },
  plugins: [],
};
