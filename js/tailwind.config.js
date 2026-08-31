tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        corner1: '#ff3b5c',
        corner2: '#3ba7ff',
        gold: '#ffd166',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        shakeX: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-8px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(8px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(.6) rotate(-8deg)' },
          '70%': { opacity: '1', transform: 'scale(1.08) rotate(2deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        impactShake: {
          '0%, 100%': { transform: 'translate(0,0) rotate(0)' },
          '20%': { transform: 'translate(-6px,2px) rotate(-1deg)' },
          '40%': { transform: 'translate(6px,-2px) rotate(1deg)' },
          '60%': { transform: 'translate(-4px,1px) rotate(-1deg)' },
          '80%': { transform: 'translate(4px,-1px) rotate(1deg)' },
        },
      },
      animation: {
        shake: 'shakeX .5s ease-in-out',
        'fade-in-up': 'fadeInUp .5s ease-out forwards',
        'pop-in': 'popIn .5s cubic-bezier(.34,1.56,.64,1) forwards',
        'impact-shake': 'impactShake .4s ease-in-out',
      },
    },
  },
};