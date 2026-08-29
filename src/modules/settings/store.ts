import { shallowReactive } from 'vue';

/**
 * @const settingsStore
 * @description 偏好设置面板显隐状态。由 settings 模块独占维护，
 * Shell 面板入口通过 panelEntry.action 调用 open() 唤醒，组件内部 v-if 控制渲染。
 */
export const settingsStore = shallowReactive({
    isVisible: false,

    open() {
        this.isVisible = true;
    },

    close() {
        this.isVisible = false;
    }
});
