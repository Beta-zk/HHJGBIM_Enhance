import { LOGIN_URL } from '../config/constants';
import { projectStateService } from '../services/ProjectStateService';

export class AuthInterceptor {
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权与请求头拦截器已挂载');
    }

    private hijackXHR(): void {
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            // 嗅探并收集所有外发请求的关键 Header
            projectStateService.updateHeaders(header, value);
            return originalSetRequestHeader.apply(this, [header, value]);
        };

        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
            (this as any)._authRequestUrl = url.toString();
            return originalXHROpen.apply(this, arguments as any);
        };

        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args: any[]) {
            const url = (this as any)._authRequestUrl || '';

            this.addEventListener('readystatechange', function() {
                // 专职拦截登录接口响应，提取最高优先级的 Token
                if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
                    if (url.includes(LOGIN_URL)) {
                        const token = this.getResponseHeader('Authorization');
                        if (token) projectStateService.setAuthToken(token);
                    }
                }
            });

            originalXHRSend.apply(this, args as any);
        };
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        window.fetch = async function(...args: any[]) {
            const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
            const options = args[1] || {};

            // 嗅探 Fetch 请求头
            if (options.headers) {
                const h = new Headers(options.headers);
                h.forEach((value, key) => {
                    projectStateService.updateHeaders(key, value);
                });
            }

            const response = await originalFetch.apply(this, args as any);
            
            // 专职拦截 Fetch 登录响应，提取 Token
            if (requestUrl.includes(LOGIN_URL) && response.ok) {
                const token = response.headers.get('Authorization');
                if (token) projectStateService.setAuthToken(token);
            }
            
            return response;
        };
    }
}
