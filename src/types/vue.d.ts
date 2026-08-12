/**
 * @module vue
 * @description Vue SFC 泛型系统声明映射。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
