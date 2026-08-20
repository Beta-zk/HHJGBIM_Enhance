import './style.css';
import { NetworkHook } from './core/NetworkHook';
import { domMaster } from './core/DomMaster';
import { authService } from './services/AuthService';
import { enhanceManager } from './kernel/EnhanceManager';
import { projectStateEnhance } from './modules/project-state';
import { bigScreenEnhance } from './modules/production-big-screen';
import { barcodePrintEnhance } from './modules/barcode-print';
import { materialInventoryEnhance } from './modules/material-inventory';
import { createApp } from 'vue';
import App from './view/App.vue';

/**
 * @module Main
 * @description 应用主入口。激活网络劫持引擎、鉴权状态机与 DOM 基建，随后以声明式清单装载全部增强模块
 * （开关/路由/拦截器/样式由增强内核统一管理），并负责外挂交互框架的挂载。
 */
(function() {
    'use strict';
    
    // 激活底层网络劫持总线与页面情报缓存引擎
    NetworkHook.getInstance().init();
    domMaster.init();
    authService.initObserver();

    // 声明式装载增强模块清单：配置开关、路由约束、拦截器与样式回收由 EnhanceManager 统一裁决
    enhanceManager
        .registerAll([
            projectStateEnhance,
            bigScreenEnhance,
            barcodePrintEnhance,
            materialInventoryEnhance
        ])
        .start();
    
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
