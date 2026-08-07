/**
 * 鉴权管理服务类
 * 负责动态请求头的存储、更新，并提供针对异步 UI 模块的 Token 就绪等待订阅机制。
 */
class AuthService {
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    
    private readonly AUTH_STORAGE_KEY = 'HHJG_BIM_AUTH_TOKEN';
    private tokenResolvers: Array<(token: string) => void> = [];

    constructor() {
        const savedToken = localStorage.getItem(this.AUTH_STORAGE_KEY);
        if (savedToken) {
            this.dynamicHeaders['Authorization'] = savedToken;
        }
    }

    /**
     * 更新请求头信息
     * 当嗅探到有效的 Authorization 请求头时，不仅进行持久化，同时会唤醒所有处于等待状态的 UI 异步任务。
     * @param key 请求头键名
     * @param value 请求头键值
     */
    public updateHeaders(key: string, value: string): void {
        const lowerKey = key.toLowerCase();
        
        if (lowerKey === 'authorization') {
            if (this.dynamicHeaders['Authorization'] !== value) {
                this.dynamicHeaders['Authorization'] = value;
                localStorage.setItem(this.AUTH_STORAGE_KEY, value);
                this.notifyTokenReady(value);
            }
            return;
        }

        if (
            lowerKey === 'last_working_object_id' || 
            lowerKey.includes('tenant') || 
            lowerKey.includes('token') || 
            lowerKey.startsWith('x-')
        ) {
            this.dynamicHeaders[key] = value;
        }
    }

    /**
     * 挂起并等待有效 Token 注入
     * 若当前已存在 Token 则立即返回；若不存在，则返回一个挂起的 Promise，直到 AuthInterceptor 捕获到 Token 时被唤醒。
     * @returns 解析为有效 Authorization 字符串的 Promise
     */
    public async waitForToken(): Promise<string> {
        if (this.dynamicHeaders['Authorization']) {
            return Promise.resolve(this.dynamicHeaders['Authorization']);
        }

        return new Promise((resolve) => {
            this.tokenResolvers.push(resolve);
        });
    }

    /**
     * 内部通知方法
     * 唤醒等待队列中的所有 Promise 任务
     * @param token 捕获到的最新 Token
     */
    private notifyTokenReady(token: string): void {
        while (this.tokenResolvers.length > 0) {
            const resolve = this.tokenResolvers.shift();
            if (resolve) resolve(token);
        }
    }

    /**
     * 获取当前完整的动态请求头映射表
     * @returns 映射表对象
     */
    public getHeaders(): Record<string, string> {
        return this.dynamicHeaders;
    }

    /**
     * 清除本地鉴权状态
     */
    public clearAuth(): void {
        delete this.dynamicHeaders['Authorization'];
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
    }
}

export const authService = new AuthService();
