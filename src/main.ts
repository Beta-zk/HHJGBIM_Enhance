import { AuthInterceptor } from './core/AuthInterceptor';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { createApp } from 'vue';
import App from './View/App.vue';

(function() {
    'use strict';
    
    /** 
     * @description 1. 初始化全局鉴权与请求头静默嗅探拦截器 
     */
    new AuthInterceptor().init();
    
    /** 
     * @description 2. 初始化各业务增强模块 
     */
    new ProjectInventoryEnhance().init();
    
    console.log('[HHJGBIM_Enhance] 核心模块加载完毕。鉴权拦截器已就绪。');

    /**
     * @function mountVueUI
     * @description 3. 安全挂载 Vue UI 容器，规避 DOM 尚未加载的异常
     * @returns {void}
     */
    const mountVueUI = () => {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'hhjgbim-vue-root';
        document.body.appendChild(uiContainer);
        
        const app = createApp(App);
        app.mount(uiContainer);
    };

    /** 
     * @description 兼容 document-start 模式下的安全 DOM 注入 
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountVueUI);
    } else {
        mountVueUI();
    }
})();
