import { authService } from '../services/AuthService';
import { GET_USER_ENTITY_URL } from '../config/constants';

export class AuthInterceptor {
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权拦截器已挂载 (精准嗅探模式)');
    }

    private hijackXHR(): void {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        
        /**
         * 劫持 open 以缓存当前请求 URL
         */
        XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
            (this as any)._authRequestUrl = url.toString();
            return originalOpen.apply(this, [method, url, ...args] as any);
        };

        /**
         * 劫持 setRequestHeader
         * 仅当目标接口匹配 GET_USER_ENTITY_URL 时，才向 AuthService 注入 Token
         */
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            const url = (this as any)._authRequestUrl || '';
            
            if (url.includes(GET_USER_ENTITY_URL)) {
                authService.updateHeaders(header, value);
            }
            
            return originalSetRequestHeader.apply(this, [header, value]);
        };
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args: any[]) {
            const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');

            /**
             * 仅当目标接口匹配 GET_USER_ENTITY_URL 时，提取 Request Headers
             */
            if (requestUrl.includes(GET_USER_ENTITY_URL)) {
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
            }

            return await originalFetch.apply(this, args as any);
        };
    }
}
