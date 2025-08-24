/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#C8E6C9',
          100: '#C8E6C9',
          500: '#66BB6A',
          600: '#2E7D32',
          700: '#1B5E20',
        },
        gray: {
          50: '#F5F5F5',
          100: '#F5F5F5',
          500: '#9E9E9E',
          900: '#212121',
        }
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
};
