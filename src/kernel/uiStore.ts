import { shallowReactive } from 'vue';
import type { Component } from 'vue';

/**
 * @const uiStore
 * @description 动态组件视图沙箱。作为 Vanilla JS 内核与全局 Vue 根实例之间的通信桥梁，
 * 负责持存当前处于活跃状态的模块组件。
 */
export const uiStore = {
    activeComponents: shallowReactive(new Map<string, Component>()),
    
    register(id: string, comp: Component) {
        this.activeComponents.set(id, comp);
    },
    
    unregister(id: string) {
        this.activeComponents.delete(id);
    }
};
