/** @type {import('tailwindcss').Config} */
export default {
  content: [],
  theme: {
    extend: {
      colors: {
        // Deep purple/void tones
        veil: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#d8c0fe',
          300: '#bc94fd',
          400: '#9b5ffa',
          500: '#7c3aed',
          600: '#6620d4',
          700: '#5215b0',
          800: '#3d1290',
          900: '#2a0a6a',
          950: '#1a0a2e',
        },
        // Crystalline blue-cyan tones
        shard: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#162d6b',
          950: '#0c1445',
        },
        // Arcane gold/amber tones
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Legendary pink-rose tones
        mythic: {
          50:  '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#4c0519',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            opacity: '0.8',
            boxShadow: '0 0 8px 2px rgba(124, 58, 237, 0.4)',
          },
          '50%': {
            opacity: '1',
            boxShadow: '0 0 20px 6px rgba(124, 58, 237, 0.8)',
          },
        },
        'card-flip': {
          '0%':   { transform: 'rotateY(0deg)' },
          '50%':  { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        'pity-trigger': {
          '0%, 100%': { transform: 'scale(1)',    filter: 'brightness(1)' },
          '50%':       { transform: 'scale(1.05)', filter: 'brightness(1.4)' },
        },
      },
      animation: {
        'glow-pulse':    'glow-pulse 2s ease-in-out infinite',
        'card-flip':     'card-flip 0.6s ease-in-out',
        'pity-trigger':  'pity-trigger 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
