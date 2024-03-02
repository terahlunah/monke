/** @type {import('tailwindcss').Config} */

import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: [
    `./src/**/*.{js,jsx,ts,tsx}`,
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Noto Sans"', ...defaultTheme.fontFamily.sans],
        'serif': ['"Noto Serif"', ...defaultTheme.fontFamily.serif],
      },
      colors: {
        'on-surface': '#ffffff',
        surface: '#2c2b2b',
        background: '#1f1f1f',
        primary: '#1c8f8f',
        secondary: '#3b4c9d',
        'accent-warning': '#b78426',
        'accent-caution': '#b76028',
        'accent-danger': '#c45555',
      },
    },
  },
  plugins: [],
}

