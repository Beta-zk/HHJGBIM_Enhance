import { authService } from '../services/AuthService';
import { NetworkManager } from './NetworkManager';

/**
 * @class AuthInterceptor
 * @description 鉴权业务模块。现已重构为面向 NetworkManager 的纯净订阅者。
 */
export class AuthInterceptor {
    /**
     * @method init
     * @description 注册请求头嗅探钩子，放弃对底层原生对象的暴力篡改。
     * @returns {void}
     */
    public init(): void {
        NetworkManager.getInstance().registerHeaderSniffer((key, value) => {
            authService.updateHeaders(key, value);
        });
        console.log('[HHJGBIM_Enhance] 鉴权嗅探业务已注册至总线');
    }
}
