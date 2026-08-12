import { NetworkHook } from './core/NetworkHook';
import { authService } from './services/AuthService';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { ProductionIntegrationBigScreenEnhance } from './core/ProductionIntegrationBigScreenEnhance';
import { settings } from './config/settings';
import { createApp } from 'vue';
import App from './view/App.vue';

(function() {
    'use strict';
    
    // 获取最新配置项 JSON
    const userConfig = settings.get();

    /** 第一序列：注册并实例化全局网络底层通讯钩子 (强制装载核心) */
    NetworkHook.getInstance().init();

    /** 第二序列：初始化鉴权业务的嗅探监听生命周期 (强制装载核心) */
    authService.initObserver();

    /** 第三序列：依照配置项路由挂载业务拦截与 DOM 增强插件 (按需装载) */
    if (userConfig.enableProjectInventory) {
        new ProjectInventoryEnhance().init();
        console.log('[HHJGBIM_Enhance] 模块启用: ProjectInventoryEnhance');
    }
    
    if (userConfig.enableProductionBigScreen) {
        new ProductionIntegrationBigScreenEnhance().init();
        console.log('[HHJGBIM_Enhance] 模块启用: ProductionIntegrationBigScreenEnhance');
    }
    
    console.log('[HHJGBIM_Enhance] 工程引擎全组件加载合龙，当前配置:', userConfig);

    /** 尾部序列：安全触发 Vue 沙盒视图渲染 */
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
