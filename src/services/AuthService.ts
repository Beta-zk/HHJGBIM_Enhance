import { NetworkHook } from '../core/NetworkHook';

/**
 * @class AuthService
 * @description 鉴权凭证调度机。订阅底层网络请求头事件流，负责核心会话信息（Token、对象 ID 等）的截获、时效缓存以及跨服务调用时的异步闭锁。
 */
class AuthService {
    public dynamicHeaders: Record<string, string> = {
        "content-type": "application/json",
        "priority": "u=1, i"
    };

    private readonly AUTH_STORAGE_KEY = 'HHJG_BIM_AUTH_TOKEN';
    private readonly AUTH_TIME_KEY = 'HHJG_BIM_AUTH_TIME';
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
    private tokenResolvers: Array<(token: string) => void> = [];
    private isSessionTokenReady: boolean = false;

    private readonly SESSION_HEADERS = new Set([
        'authorization',
        'last_working_object_id'
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
     * @description 将凭证更新策略桥接至网络嗅探管线，实现被动式授权与对象标识的动态更新。
     */
    public initObserver(): void {
        NetworkHook.getInstance().registerHeaderSniffer((key, value) => {
            this.updateHeaders(key, value);
        });
    }

    /**
     * @method updateHeaders
     * @description 嗅探会话头并落库：authorization 变更时持久化并唤醒等待中的闭锁；对象 ID 仅内存更新。
     * @param {string} key 请求头名
     * @param {string} value 请求头值
     */
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

        if (lowerKey === 'last_working_object_id') {
            this.dynamicHeaders['last_working_object_id'] = value;
        }
    }

    /**
     * @method waitForToken
     * @description 异步闭锁函数，阻断依赖提权通讯的方法直至凭证就绪。
     * @returns {Promise<string>}
     */
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

    /**
     * @method getHeaders
     * @description 获取当前动态请求头集合（含授权凭证与对象 ID）。
     * @returns {Record<string, string>}
     */
    public getHeaders(): Record<string, string> {
        return this.dynamicHeaders;
    }

    /**
     * @method clearAuth
     * @description 清除会话凭证：删除内存头与本地存储，并将凭证就绪状态复位。
     */
    public clearAuth(): void {
        delete this.dynamicHeaders['authorization'];
        delete this.dynamicHeaders['last_working_object_id'];
        this.isSessionTokenReady = false;
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
        localStorage.removeItem(this.AUTH_TIME_KEY);
    }
}

export const authService = new AuthService();
