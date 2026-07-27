import { Interceptor } from './core/Interceptor';

(function() {
    'use strict';
    console.log('[HHJGBIM_Enhance] 初始化引擎...');
    
    const interceptor = new Interceptor();
    interceptor.init();
    
    console.log('[HHJGBIM_Enhance] 拦截器挂载完毕。');
})();
