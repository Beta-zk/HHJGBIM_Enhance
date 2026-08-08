/**
 * @class AuthService
 * @description 鉴权管理核心枢纽。实现基于差值对比的令牌热更新，修复状态机锁死缺陷，集成24小时生命周期校验。
 */
class AuthService {
    /** @description 动态请求头集合 */
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    
    /** @description 授权凭证持久化键名 */
    private readonly AUTH_STORAGE_KEY = 'HHJG_BIM_AUTH_TOKEN';
    /** @description 授权时间戳持久化键名 */
    private readonly AUTH_TIME_KEY = 'HHJG_BIM_AUTH_TIME';
    /** @description 24小时有效期的毫秒数阈值 */
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

    /** @description 等待令牌的微任务解析器队列 */
    private tokenResolvers: Array<(token: string) => void> = [];
    /** @description 会话令牌就绪状态标识，破除单页应用异步死锁的核心控制柄 */
    private isSessionTokenReady: boolean = false; 

    /**
     * @description 全局会话凭证白名单，滤除无关请求头
     */
    private readonly SESSION_HEADERS = new Set([
        'authorization',
        'last_working_object_id',
        'priority'
    ]);

    /**
     * @constructor
     * @description 初始化鉴权服务，验证本地缓存的时效性，修复并同步状态机就绪标识。
     */
    constructor() {
        const savedToken = localStorage.getItem(this.AUTH_STORAGE_KEY);
        const savedTime = localStorage.getItem(this.AUTH_TIME_KEY);
        
        if (savedToken && savedTime) {
            const now = Date.now();
            if (now - parseInt(savedTime, 10) < this.CACHE_DURATION) {
                this.dynamicHeaders['authorization'] = savedToken;
                // 【核心修复】同步开启逻辑状态锁，防止微任务永久挂起
                this.isSessionTokenReady = true;
            } else {
                this.clearAuth();
            }
        } else if (savedToken && !savedTime) {
            this.clearAuth();
        }
    }

    /**
     * @method updateHeaders
     * @description 采用差分策略更新请求头。捕捉到异构新凭证即刻触发内存覆写与存储重置。
     * @param {string} key 请求头键名
     * @param {string} value 请求头键值
     * @returns {void}
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

        this.dynamicHeaders[lowerKey] = value;
    }

    /**
     * @method waitForToken
     * @description 供给外部业务流调用的安全令牌异步等待屏障。
     * @returns {Promise<string>} 鉴权令牌
     */
    public async waitForToken(): Promise<string> {
        if (this.isSessionTokenReady && this.dynamicHeaders['authorization']) {
            return Promise.resolve(this.dynamicHeaders['authorization']);
        }
        return new Promise((resolve) => {
            this.tokenResolvers.push(resolve);
        });
    }

    /**
     * @method notifyTokenReady
     * @description 消费并清空微任务等待队列。
     * @param {string} token 当前有效令牌
     * @returns {void}
     */
    private notifyTokenReady(token: string): void {
        while (this.tokenResolvers.length > 0) {
            const resolve = this.tokenResolvers.shift();
            if (resolve) resolve(token);
        }
    }

    /**
     * @method getHeaders
     * @description 提取已组装完毕的动态请求头映射。
     * @returns {Record<string, string>}
     */
    public getHeaders(): Record<string, string> {
        return this.dynamicHeaders;
    }

    /**
     * @method clearAuth
     * @description 鉴权熔断清理过程。
     * @returns {void}
     */
    public clearAuth(): void {
        delete this.dynamicHeaders['authorization'];
        this.isSessionTokenReady = false;
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
        localStorage.removeItem(this.AUTH_TIME_KEY);
    }
}

export const authService = new AuthService();
