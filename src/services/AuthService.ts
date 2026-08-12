import { NetworkHook } from '../core/NetworkHook';

/**
 * @class AuthService
 * @description 鉴权状态机。订阅网络底层头部嗅探事件流，接管 Token 的提权、缓存续期与组件间的异步阻塞等待机制。
 */
class AuthService {
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    
    private readonly AUTH_STORAGE_KEY = 'HHJG_BIM_AUTH_TOKEN';
    private readonly AUTH_TIME_KEY = 'HHJG_BIM_AUTH_TIME';
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
    private tokenResolvers: Array<(token: string) => void> = [];
    private isSessionTokenReady: boolean = false; 

    private readonly SESSION_HEADERS = new Set([
        'authorization',
        'last_working_object_id',
        'priority'
    ]);

    constructor() {
        const savedToken = localStorage.getItem(this.AUTH_STORAGE_KEY);
        const savedTime = localStorage.getItem(this.AUTH_TIME_KEY);
        
        if (savedToken && savedTime) {
            const now = Date.now();
            if (now - parseInt(savedTime, 10) < this.CACHE_DURATION) {
                this.dynamicHeaders['authorization'] = savedToken;
                this.isSessionTokenReady = true;
            } else {
                this.clearAuth();
            }
        } else if (savedToken && !savedTime) {
            this.clearAuth();
        }
    }

    /**
     * @method initObserver
     * @description 初始化观察者模式，与网络基建层完成生命周期绑定。
     * @returns {void}
     */
    public initObserver(): void {
        NetworkHook.getInstance().registerHeaderSniffer((key, value) => {
            this.updateHeaders(key, value);
        });
    }

    public updateHeaders(key: string, value: string): void {
        const lowerKey = key.toLowerCase();
        if (!this.SESSION_HEADERS.has(lowerKey)) return;

        if (lowerKey === 'authorization') {
            if (this.dynamicHeaders['authorization'] !== value) {
                this.dynamicHeaders['authorization'] = value;
                this.isSessionTokenReady = true;
                localStorage.setItem(this.AUTH_STORAGE_KEY, value);
                localStorage.setItem(this.AUTH_TIME_KEY, Date.now().toString());
                this.notifyTokenReady(value);
            }
            return;
        }
        this.dynamicHeaders[lowerKey] = value;
    }

    public async waitForToken(): Promise<string> {
        if (this.isSessionTokenReady && this.dynamicHeaders['authorization']) {
            return Promise.resolve(this.dynamicHeaders['authorization']);
        }
        return new Promise((resolve) => {
            this.tokenResolvers.push(resolve);
        });
    }

    private notifyTokenReady(token: string): void {
        while (this.tokenResolvers.length > 0) {
            const resolve = this.tokenResolvers.shift();
            if (resolve) resolve(token);
        }
    }

    public getHeaders(): Record<string, string> {
        return this.dynamicHeaders;
    }

    public clearAuth(): void {
        delete this.dynamicHeaders['authorization'];
        this.isSessionTokenReady = false;
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
        localStorage.removeItem(this.AUTH_TIME_KEY);
    }
}

export const authService = new AuthService();
