import { ProjectInventoryEnhance } from './core/ProjectInventoryEnhance';

(function() {
    'use strict';
    console.log('[HHJGBIM_Enhance] 初始化引擎...');
    
    new ProjectInventoryEnhance().init();
    
    console.log('[HHJGBIM_Enhance] 拦截器挂载完毕。');
})();
