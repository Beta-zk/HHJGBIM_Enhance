import { authService } from '../services/AuthService';

/**
 * @class AuthInterceptor
 * @description 鉴权拦截器类。负责对底层网络通讯对象进行无侵入式代理，执行全域令牌嗅探。
 */
export class AuthInterceptor {
    
    /**
     * @method init
     * @description 初始化拦截器，挂载双路底层协议劫持。
     * @returns {void}
     */
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权全域无差别嗅探拦截器已挂载');
    }

    /**
     * @method hijackXHR
     * @description 代理重写 XMLHttpRequest 以实现全量请求头拦截。
     * @returns {void}
     */
    private hijackXHR(): void {
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            authService.updateHeaders(header, value);
            return originalSetRequestHeader.apply(this, [header, value]);
        };
    }

    /**
     * @method hijackFetch
     * @description 代理重写 window.fetch 以实现全量请求头拦截。
     * @returns {void}
     */
    private hijackFetch(): void {
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args: any[]) {
            let headersObj: Headers | null = null;

            if (args[0] instanceof Request) {
                headersObj = args[0].headers;
            } else if (args[1] && args[1].headers) {
                headersObj = new Headers(args[1].headers);
            }

            if (headersObj) {
                headersObj.forEach((value, key) => {
                    authService.updateHeaders(key, value);
                });
            }

            return await originalFetch.apply(this, args as any);
        };
    }
}
