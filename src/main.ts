import { AuthInterceptor } from './core/AuthInterceptor';
import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';

(function() {
    'use strict';
    console.log('[HHJGBIM_Enhance] 初始化脚本');
    
    // 1. 优先初始化全局鉴权与请求头拦截器
    new AuthInterceptor().init();
    
    // 2. 初始化各业务增强模块
    new ProjectInventoryEnhance().init();
    
    // 若后续有其他模块（如 DocumentEnhance 等），在此处继续 new 并 init()
    
    console.log('[HHJGBIM_Enhance] 所有模块加载完毕');
})();
