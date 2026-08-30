/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B1120',
          800: '#111827',
          700: '#1F2937',
          600: '#374151',
          500: '#4B5563'
        }
      }
    }
  },
  plugins: []
}
