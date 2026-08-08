/**
 * 鉴权管理服务类
 * 实现基于双路监听的状态同步机制，彻底隔离业务配置与底层网络嗅探。
 */
class AuthService {
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    
    private readonly AUTH_STORAGE_KEY = 'HHJG_BIM_AUTH_TOKEN';
    private tokenResolvers: Array<(token: string) => void> = [];
    private isSessionTokenReady: boolean = false; 

    /**
     * @description 全局会话凭证白名单，滤除无关请求头
     */
    private readonly SESSION_HEADERS = new Set([
        'authorization',
        'last_working_object_id',
        'priority'
    ]);

    constructor() {
        const savedToken = localStorage.getItem(this.AUTH_STORAGE_KEY);
        if (savedToken) {
            this.dynamicHeaders['authorization'] = savedToken;
        }
    }

    /**
     * 更新请求头信息，执行仲裁逻辑
     * @param {string} key - 请求头键名
     * @param {string} value - 请求头键值
     * @param {boolean} isPrimary - 标识是否源自高优先级的 LOGIN 接口
     */
    public updateHeaders(key: string, value: string, isPrimary: boolean = false): void {
        const lowerKey = key.toLowerCase();
        
        // 拒收非白名单数据
        if (!this.SESSION_HEADERS.has(lowerKey)) return;

        // 【仲裁逻辑】: 若存在凭证，非 Primary(如 GetUserEntity) 不得覆盖 Primary 产生的数据；
        // 只有在缺失状态下，非 Primary 来源才具备补充资格。
        if (lowerKey === 'authorization') {
            if (!this.isSessionTokenReady || isPrimary) {
                this.dynamicHeaders['authorization'] = value;
                this.isSessionTokenReady = true;
                localStorage.setItem(this.AUTH_STORAGE_KEY, value);
                this.notifyTokenReady(value);
            }
            return;
        }

        // 常规状态量覆盖
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
    }
}

export const authService = new AuthService();
