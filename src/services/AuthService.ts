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
    
    /**
     * @description 核心状态锁：标记当前会话是否已成功拦截到最新 Token
     */
    private isSessionTokenReady: boolean = false; 

    constructor() {
        const savedToken = localStorage.getItem(this.AUTH_STORAGE_KEY);
        if (savedToken) {
            this.dynamicHeaders['Authorization'] = savedToken;
        }
    }

    /**
     * 更新请求头信息
     * 当嗅探到有效的 Authorization 请求头时，进行持久化并无条件唤醒等待队列。
     * @param {string} key - 请求头键名
     * @param {string} value - 请求头键值
     */
    public updateHeaders(key: string, value: string): void {
        const lowerKey = key.toLowerCase();
        
        if (lowerKey === 'authorization') {
            this.dynamicHeaders['Authorization'] = value;
            this.isSessionTokenReady = true; // 标记已获取当前会话最新有效凭证
            localStorage.setItem(this.AUTH_STORAGE_KEY, value);
            
            // 无论 Token 是否发生变化，只要成功拦截到了有效请求，就立即唤醒所有挂起的业务逻辑
            this.notifyTokenReady(value);
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
     * 严格等待当前页面生命周期内拦截到的最新 Token，避免由于使用本地过期缓存导致 401 鉴权失败。
     * @returns {Promise<string>} 解析为有效 Authorization 字符串的 Promise
     */
    public async waitForToken(): Promise<string> {
        // 必须满足“当前会话已拦截”且“存在 Token”双重条件，才予以放行
        if (this.isSessionTokenReady && this.dynamicHeaders['Authorization']) {
            return Promise.resolve(this.dynamicHeaders['Authorization']);
        }

        return new Promise((resolve) => {
            this.tokenResolvers.push(resolve);
        });
    }

    /**
     * 内部通知方法
     * 唤醒等待队列中的所有 Promise 任务
     * @param {string} token - 捕获到的最新 Token
     */
    private notifyTokenReady(token: string): void {
        while (this.tokenResolvers.length > 0) {
            const resolve = this.tokenResolvers.shift();
            if (resolve) resolve(token);
        }
    }

    /**
     * 获取当前完整的动态请求头映射表
     * @returns {Record<string, string>} 映射表对象
     */
    public getHeaders(): Record<string, string> {
        return this.dynamicHeaders;
    }

    /**
     * 清除本地鉴权状态
     * 触发 401 时重置状态锁，以便后续请求重新进入挂起等待
     */
    public clearAuth(): void {
        delete this.dynamicHeaders['Authorization'];
        this.isSessionTokenReady = false;
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
    }
}

export const authService = new AuthService();
