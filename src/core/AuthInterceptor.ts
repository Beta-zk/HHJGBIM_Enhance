import { authService } from '../services/AuthService';
import { API_URLS } from '../config/constants';

export class AuthInterceptor {
    
    // 注册双路监听目标
    private readonly TARGET_ENDPOINTS = [
        API_URLS.LOGIN, 
        API_URLS.USER_ENTITY
    ];

    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权双通道拦截器已挂载');
    }

    /**
     * 判断当前 URL 是否为监听目标，并判定其是否为最高优先级的登录来源
     */
    private checkTargetRoute(requestUrl: string): { isTarget: boolean, isPrimary: boolean } {
        const isTarget = this.TARGET_ENDPOINTS.some(url => requestUrl.includes(url));
        const isPrimary = requestUrl.includes(API_URLS.LOGIN);
        return { isTarget, isPrimary };
    }

    private hijackXHR(): void {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        
        XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
            (this as any)._authRequestUrl = url.toString();
            return originalOpen.apply(this, [method, url, ...args] as any);
        };

        const self = this;
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            const url = (this as any)._authRequestUrl || '';
            const { isTarget, isPrimary } = self.checkTargetRoute(url);
            
            if (isTarget) {
                authService.updateHeaders(header, value, isPrimary);
            }
            
            return originalSetRequestHeader.apply(this, [header, value]);
        };
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(...args: any[]) {
            const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
            const { isTarget, isPrimary } = self.checkTargetRoute(requestUrl);

            if (isTarget) {
                let headersObj: Headers | null = null;

                if (args[0] instanceof Request) {
                    headersObj = args[0].headers;
                } else if (args[1] && args[1].headers) {
                    headersObj = new Headers(args[1].headers);
                }

                if (headersObj) {
                    headersObj.forEach((value, key) => {
                        authService.updateHeaders(key, value, isPrimary);
                    });
                }
            }

            return await originalFetch.apply(this, args as any);
        };
    }
}
