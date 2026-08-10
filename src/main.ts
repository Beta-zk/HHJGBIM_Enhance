import { NetworkManager } from './core/NetworkManager';
import { AuthInterceptor } from './core/AuthInterceptor';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { createApp } from 'vue';
import App from './View/App.vue';

(function() {
    'use strict';
    
    /** 
     * @description 1. 优先实例化并启动全局单例网络基建
     */
    NetworkManager.getInstance().init();

    /** 
     * @description 2. 依次初始化并注册各业务插件 
     */
    new AuthInterceptor().init();
    new ProjectInventoryEnhance().init();
    
    console.log('[HHJGBIM_Enhance] 核心基建与业务插件加载完毕');

    /**
     * @function mountVueUI
     * @description 3. 安全挂载 Vue UI 容器
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
