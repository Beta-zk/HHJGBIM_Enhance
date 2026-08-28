/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  important: '#hhjgbim-vue-root',
  corePlugins: {
    // 绝对禁止开启！否则会抹除宿主站点(bimtk.com)的所有原生样式
    preflight: false,
    // 禁用 container 组件：其规则属于 components 层，不受 important 选择器前缀约束，
    // 会以无前缀形式泄漏全局并锁死宿主页面同名 .container 元素宽度（如原材料仓 .container.abs100）
    container: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
