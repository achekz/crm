/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Poppins', 'sans-serif'],
        'serif': ['Merriweather', 'serif'],
      },
      colors: {
        primary: '#4a6b6a',
        accent: '#d9c9ac',
        background: '#f3f2ef',
        dark: '#1a1a1a',
        success: '#4CAF50',
        danger: '#FF4B4B',
        warning: '#FFA726',
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        sand: {
          50: '#faf9f7',
          100: '#f3f2ef',
          200: '#e8e5e0',
          300: '#d9c9ac',
          400: '#c4a484',
          500: '#b08968',
          600: '#9c7a5c',
          700: '#826650',
          800: '#6b5547',
          900: '#58473c',
        }
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
};