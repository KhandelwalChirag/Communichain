/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        secondary: {
          DEFAULT: '#64748b',
          dark: '#475569',
        },
        accent: '#0ea5e9',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}