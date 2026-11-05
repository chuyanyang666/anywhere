/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0810',
        panel: '#141018',
        violet: '#b44cff',
        magenta: '#e14bff',
        dim: '#8d869c',
      },
      fontFamily: {
        sans: ['Inter', 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
