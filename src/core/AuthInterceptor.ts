import { authService } from '../services/AuthService';

export class AuthInterceptor {
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权拦截器已挂载');
    }

    private hijackXHR(): void {
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            authService.updateHeaders(header, value);
            return originalSetRequestHeader.apply(this, [header, value]);
        };
    }

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
