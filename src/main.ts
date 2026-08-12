import { NetworkHook } from './core/NetworkHook';
import { authService } from './services/AuthService';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { ProductionIntegrationBigScreenEnhance } from './core/ProductionIntegrationBigScreenEnhance';
import { settings } from './config/settings';
import { createApp } from 'vue';
import App from './view/App.vue';

/**
 * @module Main
 * @description 应用启动层，调度基建状态机流转及模块按需挂载。
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
    
    console.log('[Core] 引擎加载完毕', userConfig);

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
