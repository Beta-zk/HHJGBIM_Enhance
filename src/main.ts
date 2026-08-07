/**
 * HHJGBIM_Enhance 主程序入口
 * 依序挂载底层网络拦截器与各业务流重载模块，并安全注入 Vue UI 面板。
 */
import { AuthInterceptor } from './core/AuthInterceptor';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { factoryService } from './services/FactoryService';
import { createApp } from 'vue';
import App from './View/App.vue';

(function() {
    'use strict';
    
    // 1. 初始化全局鉴权与请求头静默嗅探拦截器
    new AuthInterceptor().init();
    
    // 2. 初始化各业务增强模块
    new ProjectInventoryEnhance().init();
    
    factoryService.fetchMonthlyOutput().then(res => {
        console.log('[HHJGBIM_Enhance] 🏭 FactoryService 测试数据返回:', res);
    });
    
    console.log('[HHJGBIM_Enhance] 核心模块加载完毕。鉴权拦截器已就绪。');

    // 3. 安全挂载 Vue UI 容器
    const mountVueUI = () => {
        const uiContainer = document.createElement('div');
        uiContainer.id = 'hhjgbim-vue-root';
        document.body.appendChild(uiContainer);
        
        const app = createApp(App);
        app.mount(uiContainer);
    };

    // 兼容 document-start 模式下的安全 DOM 注入
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountVueUI);
    } else {
        mountVueUI();
    }
})();
