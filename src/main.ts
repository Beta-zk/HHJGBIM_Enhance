import { NetworkHook } from './core/NetworkHook';
import { authService } from './services/AuthService';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { ProductionIntegrationBigScreenEnhance } from './core/ProductionIntegrationBigScreenEnhance';
import { settings } from './config/settings';
import { createApp } from 'vue';
import App from './view/App.vue';

/**
 * @module Main
 * @description 应用主入口。统筹网络劫持引擎、鉴权状态机及各类增强中间件的初始化顺序，并负责外挂交互框架的挂载。
 */
(function() {
    'use strict';
    
    const userConfig = settings.get();

    NetworkHook.getInstance().init();
    authService.initObserver();

    if (userConfig.enableProjectInventory) {
        new ProjectInventoryEnhance().init();
    }
    
    if (userConfig.enableProductionBigScreen) {
        new ProductionIntegrationBigScreenEnhance().init();
    }
    
    console.log('[Core] 增强核心引擎装载完毕');

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
