export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        income: 'rgb(var(--income) / <alpha-value>)',
        expense: 'rgb(var(--expense) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        rail: 'rgb(var(--rail) / <alpha-value>)',
        'rail-text': 'rgb(var(--rail-text) / <alpha-value>)',
        'rail-muted': 'rgb(var(--rail-muted) / <alpha-value>)',
        'rail-accent': 'rgb(var(--rail-accent) / <alpha-value>)',
      },
      fontFamily: { sans: ['"Geist Variable"', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        popIn: {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.96)', filter: 'blur(4px)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        grow: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'pop-in': 'popIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        shimmer: 'shimmer 1.8s linear infinite',
        grow: 'grow 0.9s cubic-bezier(0.16, 1, 0.3, 1) backwards',
      },
    },
  },
}
