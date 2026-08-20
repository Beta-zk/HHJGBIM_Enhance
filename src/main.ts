import './style.css';
import { NetworkHook } from './core/NetworkHook';
import { domMaster } from './core/DomMaster';
import { authService } from './services/AuthService';
import { ProjectStateEnhance } from './core/ProjectStateEnhance';
import { ProductionIntegrationBigScreenEnhance } from './core/ProductionIntegrationBigScreenEnhance';
import { BarcodePrintEnhance } from './core/BarcodePrintEnhance';
import { ProjectMaterialInventoryEnhance } from './core/ProjectMaterialInventoryEnhance';
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

    // 激活底层网络劫持总线与页面情报缓存引擎
    NetworkHook.getInstance().init();
    domMaster.init();
    authService.initObserver();

    // 级联注入各功能面增强引擎
    if (userConfig.enableProjectState) {
        new ProjectStateEnhance().init();
    }
    
    if (userConfig.enableProductionBigScreen) {
        new ProductionIntegrationBigScreenEnhance().init();
    }

    if (userConfig.enableBarcodePrintEnhance) {
        new BarcodePrintEnhance().init();
    }

    if (userConfig.enableProjectMaterialInventory || userConfig.enableProjectMaterialInventory === undefined) {
        new ProjectMaterialInventoryEnhance().init();
    }
    
    console.log('[Core] 华泓精工BIM增强脚本加载完毕');

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
