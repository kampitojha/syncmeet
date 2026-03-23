export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
      },
      keyframes: {
        'pulse-glow': {
           '0%, 100%': { boxShadow: '0 0 5px rgba(0, 242, 255, 0.2)' },
           '50%': { boxShadow: '0 0 25px rgba(0, 242, 255, 0.5)' },
        },
        'float': {
           '0%, 100%': { transform: 'translateY(0)' },
           '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
           '0%': { transform: 'translateY(20px)', opacity: '0' },
           '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
           '0%': { opacity: '0' },
           '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
