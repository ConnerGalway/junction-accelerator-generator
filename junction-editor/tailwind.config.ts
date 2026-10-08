import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Junction brand colors
        navy: {
          DEFAULT: '#11154b',
          mid: '#1d2260',
          light: '#2a2f70',
        },
        mint: {
          DEFAULT: '#aadab6',
          dark: '#7fbf8e',
          light: '#c5e8ce',
        },
        cream: {
          DEFAULT: '#fcf5ec',
          mid: '#f5ede0',
          dark: '#ebe3d6',
        },
        muted: '#6b6b8a',
      },
      fontFamily: {
        display: ['Raleway', 'system-ui', 'sans-serif'],
        body: ['Open Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(17, 21, 75, 0.08)',
        'card-hover': '0 8px 32px rgba(17, 21, 75, 0.12)',
        'dropdown': '0 10px 40px rgba(17, 21, 75, 0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
