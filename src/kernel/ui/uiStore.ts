import { shallowReactive } from 'vue';
import type { Component } from 'vue';

/**
 * @const uiStore
 * @description 动态组件视图沙箱。作为 Vanilla JS 内核与全局 Vue 根实例之间的通信桥梁，
 * 负责持存当前处于活跃状态的模块组件。
 */
export const uiStore = {
    activeComponents: shallowReactive(new Map<string, Component>()),

    /**
     * @method register
     * @description 注册模块视图组件至动态沙箱（模块 activate 时调用）。
     * @param {string} id 模块 id
     * @param {Component} comp Vue 组件
     */
    register(id: string, comp: Component) {
        this.activeComponents.set(id, comp);
    },

    /**
     * @method unregister
     * @description 移除模块视图组件（模块 deactivate 时调用）。
     * @param {string} id 模块 id
     */
    unregister(id: string) {
        this.activeComponents.delete(id);
    }
};
