import './style.css';
import { NetworkHook } from './core/NetworkHook';
import { domMaster } from './core/DomMaster';
import { authService } from './services/AuthService';
import { enhanceManager } from './kernel/EnhanceManager';
import { projectStateEnhance } from './modules/project-state';
import { bigScreenEnhance } from './modules/production-big-screen';
import { barcodePrintEnhance } from './modules/barcode-print';
import { materialInventoryEnhance } from './modules/material-inventory';
import { tempFixesEnhance } from './modules/temp-fixes';
import { performanceReportEnhance } from './modules/performance-report';
import { settingsEnhance } from './modules/settings';
import { createApp } from 'vue';
import App from './kernel/ui/App.vue';

/**
 * @module Main
 * @description 应用主入口。激活网络劫持引擎、鉴权状态机与 DOM 基建，随后以声明式清单装载全部增强模块
 * （开关/路由/拦截器/样式/面板入口由增强内核统一管理），并负责外挂交互框架的挂载。
 */
(function() {
    'use strict';

    NetworkHook.getInstance().init();
    domMaster.init();
    authService.initObserver();

    enhanceManager
        .registerAll([
            projectStateEnhance,
            bigScreenEnhance,
            barcodePrintEnhance,
            materialInventoryEnhance,
            // tempFixesEnhance,
            performanceReportEnhance,
            settingsEnhance
        ])
        .start();

    console.log('[Core] 华泓精工BIM增强脚本加载完毕');

    /**
     * @function mountVueUI
     * @description 挂载 Vue 根实例至独立容器 #hhjgbim-vue-root，承载 Shell 面板与模块动态组件。
     */
    const mountVueUI = () => {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'hhjgbim-vue-root';
        document.body.appendChild(uiContainer);

        const app = createApp(App);
        app.mount(uiContainer);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountVueUI);
    } else {
        mountVueUI();
    }
})();
