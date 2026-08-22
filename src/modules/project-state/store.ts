import { reactive } from 'vue';

export interface IStateItem {
    name: string;
    color: string;
}

export const projectStateStore = reactive({
    isVisible: false,
    states: [] as IStateItem[],
    activeStates: new Set<string>(),

    /** 状态圆点点击触发计数：每次点击 +1，驱动悬浮窗弹出并定位至表格左上角 */
    panelTrigger: 0,

    toggleState(stateName: string) {
        if (this.activeStates.has(stateName)) {
            this.activeStates.delete(stateName);
        } else {
            this.activeStates.add(stateName);
        }
    },

    /** 请求弹出悬浮窗（由表格状态圆点点击调用） */
    requestPanel() {
        this.panelTrigger++;
    }
});
