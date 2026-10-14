import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { canvas: '#0b1118', panel: '#111a23', line: '#24323e', muted: '#8a9aa8', teal: '#44d6c2', sky: '#79bded' }, fontFamily: { sans: ['Arial', 'sans-serif'] } } },
  plugins: [],
};
export default config;
