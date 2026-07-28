import { LOGIN_URL } from '../config/constants';
import { authService } from '../services/AuthService';

export class AuthInterceptor {
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权与请求头拦截器已挂载');
    }

    private hijackXHR(): void {
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            authService.updateHeaders(header, value);
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
                        if (token) authService.setAuthToken(token);
                    }
                }
            });

            originalXHRSend.apply(this, args as any);
        };
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        window.fetch = async function(...args: any[]) {
            let requestUrl = '';
            let headersObj: Headers | null = null;

            if (args[0] instanceof Request) {
                requestUrl = args[0].url;
                headersObj = args[0].headers;
            } else {
                requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
                if (args[1] && args[1].headers) {
                    headersObj = new Headers(args[1].headers);
                }
            }

            if (headersObj) {
                headersObj.forEach((value, key) => {
                    authService.updateHeaders(key, value);
                });
            }

            const response = await originalFetch.apply(this, args as any);
            
            if (requestUrl.includes(LOGIN_URL) && response.ok) {
                const token = response.headers.get('Authorization');
                if (token) authService.setAuthToken(token);
            }
            
            return response;
        };
    }
}
