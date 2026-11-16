/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Theme: Graphite Grey (#292B2D), Metallic Bronze (#AD8A62), Silver Grey (#C3C2BE)
        graphite: {
          50: '#ECECEB',
          100: '#DCDCDA',
          200: '#C3C2BE', // Silver Grey
          300: '#A1A09B',
          400: '#6E6E6C',
          500: '#46484A',
          600: '#343638',
          700: '#292B2D', // Primary Graphite Grey
          800: '#202224',
          850: '#1B1C1E',
          900: '#171819',
          950: '#111213',
        },
        bronze: {
          50: '#FAF6F2',
          100: '#F3ECE3',
          200: '#E4D5C3',
          300: '#D2BA9F',
          400: '#C5A47E', // Light Metallic Bronze
          500: '#AD8A62', // Primary Metallic Bronze
          600: '#94734F', // Deep Bronze
          700: '#795C3E',
          800: '#5E462F',
          900: '#443221',
          950: '#2A1E14',
        },
        silver: {
          50: '#FAFAF9',
          100: '#F1F0ED',
          200: '#E4E3DF',
          300: '#C3C2BE', // Primary Silver Grey
          400: '#A4A39D',
          500: '#8A8983',
          600: '#6C6B66',
          700: '#504F4B',
          800: '#383734',
          900: '#22211F',
        },
      },
      boxShadow: {
        'bronze-sm': '0 2px 8px -2px rgba(173, 138, 98, 0.25)',
        'bronze-md': '0 8px 24px -4px rgba(173, 138, 98, 0.22)',
        'bronze-lg': '0 16px 36px -6px rgba(173, 138, 98, 0.28)',
        'bronze-glow': '0 0 25px -3px rgba(173, 138, 98, 0.35)',
        'graphite-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'graphite-inner': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
