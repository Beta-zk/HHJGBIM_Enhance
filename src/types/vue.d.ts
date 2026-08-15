/**
 * @module vue
 * @description Vue SFC 泛型系统声明映射。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

/**
 * @module css
 * @description 静态层叠样式表资源导入声明。消解 TypeScript 编译期的模块寻址异常。
 */
declare module '*.css' {
  const content: any;
  export default content;
}
