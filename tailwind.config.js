/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        init: {
          green: '#009D3C',
          'green-dark': '#007A2F',
          'green-light': '#E6F5EC',
        },
        hanse: {
          navy: '#053762',
          'navy-light': '#0A4D8A',
        },
        brand: {
          gold: '#F0AF08',
          'gold-light': '#FFF8E6',
          red: '#A12737',
          'red-light': '#F5E6E9',
          rose: '#B05D8D',
          lavender: '#A79ECD',
          gray: '#F2F2F2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(5, 55, 98, 0.06), 0 1px 2px -1px rgba(5, 55, 98, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(5, 55, 98, 0.1), 0 2px 4px -2px rgba(5, 55, 98, 0.06)',
        'elevated': '0 10px 25px -5px rgba(5, 55, 98, 0.08), 0 8px 10px -6px rgba(5, 55, 98, 0.04)',
      },
    },
  },
  plugins: [],
};
