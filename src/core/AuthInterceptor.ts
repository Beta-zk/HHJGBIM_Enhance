import { authService } from '../services/AuthService';

export class AuthInterceptor {
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
        console.log('[HHJGBIM_Enhance] 鉴权拦截器已挂载（静默嗅探模式）');
    }

    private hijackXHR(): void {
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            // 静默嗅探：只要前端任何原生请求尝试发送 Header，我们直接捕获并交由 authService 鉴定
            authService.updateHeaders(header, value);
            return originalSetRequestHeader.apply(this, [header, value]);
        };

        // 说明：已彻底移除对 LOGIN_URL 响应头的拦截代码。
        // 原网页登录成功后，接下来的任意业务请求必然会调用 setRequestHeader 注入 Token。
        // 我们只需守株待兔，即可避免 Refused to get unsafe header 报错。
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args: any[]) {
            let headersObj: Headers | null = null;

            // 提取 Fetch 请求头
            if (args[0] instanceof Request) {
                headersObj = args[0].headers;
            } else if (args[1] && args[1].headers) {
                headersObj = new Headers(args[1].headers);
            }

            // 静默嗅探 Fetch 的对外请求头
            if (headersObj) {
                headersObj.forEach((value, key) => {
                    authService.updateHeaders(key, value);
                });
            }

            return await originalFetch.apply(this, args as any);
        };
    }
}
