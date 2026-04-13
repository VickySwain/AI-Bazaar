import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-cal)', 'var(--font-geist-sans)', 'sans-serif'],
      },
      colors: {
        // Brand
        brand: {
          50:  '#f0ebff',
          100: '#ddd0ff',
          200: '#bfa6ff',
          300: '#9d70ff',
          400: '#7c3aed',
          500: '#6d28d9',
          600: '#5b21b6',
          700: '#4c1d95',
          800: '#3b1570',
          900: '#1e0844',
        },
        // Backgrounds
        bg: {
          base:     '#020617',
          surface:  '#0f172a',
          elevated: '#1e293b',
          muted:    '#334155',
          subtle:   '#0a1628',
        },
        // Text
        tx: {
          primary:   '#f8fafc',
          secondary: '#94a3b8',
          muted:     '#475569',
          disabled:  '#1e293b',
        },
        // Borders
        bd: {
          subtle: 'rgba(148,163,184,0.08)',
          base:   'rgba(148,163,184,0.15)',
          strong: 'rgba(148,163,184,0.25)',
        },
        // Accent
        neon: {
          blue:   '#38bdf8',
          purple: '#a78bfa',
          green:  '#34d399',
          amber:  '#fbbf24',
          rose:   '#fb7185',
        },
      },
      backgroundImage: {
        'brand-gradient':   'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
        'brand-gradient-r': 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        'surface-gradient': 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        'glow-purple': 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)',
        'glow-blue':   'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        'mesh-1': 'radial-gradient(at 40% 20%, rgba(124,58,237,0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(37,99,235,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(56,189,248,0.08) 0px, transparent 50%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)',
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(124,58,237,0.25)',
        'glow-md':  '0 0 24px rgba(124,58,237,0.3)',
        'glow-lg':  '0 0 48px rgba(124,58,237,0.25)',
        'glow-blue': '0 0 24px rgba(37,99,235,0.3)',
        'card':     '0 1px 3px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)',
        'card-hover': '0 1px 3px rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.4)',
        'dialog':   '0 25px 50px rgba(0,0,0,0.7)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease forwards',
        'fade-up':      'fadeUp 0.5s ease forwards',
        'fade-down':    'fadeDown 0.4s ease forwards',
        'scale-in':     'scaleIn 0.3s ease forwards',
        'slide-in-left': 'slideInLeft 0.4s ease forwards',
        'spin-slow':    'spin 8s linear infinite',
        'pulse-slow':   'pulse 4s ease-in-out infinite',
        'shimmer':      'shimmer 1.8s ease-in-out infinite',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'gradient-x':   'gradientX 4s ease infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp:      { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeDown:    { from: { opacity: '0', transform: 'translateY(-16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        glowPulse:   { '0%,100%': { boxShadow: '0 0 12px rgba(124,58,237,0.2)' }, '50%': { boxShadow: '0 0 32px rgba(124,58,237,0.5)' } },
        float:       { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        gradientX:   { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
    },
  },
  plugins: [],
}

export default config
