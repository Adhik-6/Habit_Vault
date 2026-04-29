// tailwind.config.js
const { COLORS, FONT_SIZES, SPACING, RADIUS } = require('./src/design/tailwindTokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tell Tailwind which files to scan for class names
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: COLORS,
      fontSize: FONT_SIZES,
      spacing: SPACING,
      borderRadius: RADIUS,

      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
    },
  },

  plugins: [],
};
