import { NetworkHook } from './core/NetworkHook';
import { authService } from './services/AuthService';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { createApp } from 'vue';
import App from './View/App.vue';

(function() {
    'use strict';
    
    /** 第一序列：注册并实例化全局网络底层通讯钩子 */
    NetworkHook.getInstance().init();

    /** 第二序列：初始化鉴权业务的嗅探监听生命周期 */
    authService.initObserver();

    /** 第三序列：挂载应用层拦截清洗业务插件 */
    new ProjectInventoryEnhance().init();
    
    console.log('[HHJGBIM_Enhance] 工程引擎全组件加载合龙');

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
