import { LOGIN_URL } from '../config/constants';
import { globalAuthManager } from '../store/GlobalAuthManager';

export class AuthInterceptor {
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权与请求头拦截器已挂载');
    }

    private hijackXHR(): void {
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            globalAuthManager.updateHeader(header, value);
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
                if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
                    if (url.includes(LOGIN_URL)) {
                        const token = this.getResponseHeader('Authorization');
                        if (token) globalAuthManager.setAuthToken(token);
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

            if (options.headers) {
                const h = new Headers(options.headers);
                h.forEach((value, key) => {
                    globalAuthManager.updateHeader(key, value);
                });
            }

            const response = await originalFetch.apply(this, args as any);
            
            if (requestUrl.includes(LOGIN_URL) && response.ok) {
                const token = response.headers.get('Authorization');
                if (token) globalAuthManager.setAuthToken(token);
            }
            
            return response;
        };
    }
}
