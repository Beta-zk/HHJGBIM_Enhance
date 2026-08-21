import { reactive } from 'vue';

export interface IStateItem {
    name: string;
    color: string;
}

export const projectStateStore = reactive({
    isVisible: false,
    states: [] as IStateItem[],
    activeStates: new Set<string>(),
    
    toggleState(stateName: string) {
        if (this.activeStates.has(stateName)) {
            this.activeStates.delete(stateName);
        } else {
            this.activeStates.add(stateName);
        }
    }
});
