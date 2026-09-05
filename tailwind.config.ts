import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#12212F', soft: '#1C3145', mute: '#3A526A', faint: '#7A8CA0' },
        paper: { DEFAULT: '#F6F4F0', card: '#FFFFFF', sink: '#EDE9E2' },
        brass: { DEFAULT: '#A8763A', lite: '#E3CFAE', wash: '#F5EDE0' },
        calm: { DEFAULT: '#17795C', wash: '#E4F1EC' },
        watch: { DEFAULT: '#D2830E', wash: '#FBEFDB' },
        alert: { DEFAULT: '#B23A2F', wash: '#F8E5E2' },
      },
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        lift: '0 1px 2px rgba(18,33,47,.06), 0 8px 24px -12px rgba(18,33,47,.18)',
        sheet: '0 -8px 40px -12px rgba(18,33,47,.28)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        sheetUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pulseRing: { '0%,100%': { opacity: '.35' }, '50%': { opacity: '.9' } },
      },
      animation: {
        rise: 'rise .32s cubic-bezier(.22,1,.36,1) both',
        sheetUp: 'sheetUp .3s cubic-bezier(.22,1,.36,1) both',
        fade: 'fade .25s ease both',
        pulseRing: 'pulseRing 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
