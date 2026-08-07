/**
 * HHJGBIM_Enhance 主程序入口
 * 依序挂载底层网络拦截器与各业务流重载模块。
 */
import { AuthInterceptor } from './core/AuthInterceptor';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';
import { factoryService } from './services/FactoryService';

(function() {
    'use strict';
    
    // 1. 初始化全局鉴权与请求头静默嗅探拦截器
    new AuthInterceptor().init();
    
    // 2. 初始化各业务增强模块
    new ProjectInventoryEnhance().init();
    
    console.log(factoryService.fetchMonthlyOutput())
    
    console.log('[HHJGBIM_Enhance] 核心模块加载完毕。鉴权拦截器已就绪。');
})();
