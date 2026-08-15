/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  important: '#hhjgbim-vue-root',
  corePlugins: {
    // 绝对禁止开启！否则会抹除宿主站点(bimtk.com)的所有原生样式
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
