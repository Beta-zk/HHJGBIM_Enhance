class AuthService {
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    
    private readonly AUTH_STORAGE_KEY = 'HHJG_BIM_AUTH_TOKEN';

    constructor() {
        const savedToken = localStorage.getItem(this.AUTH_STORAGE_KEY);
        if (savedToken) {
            this.dynamicHeaders['Authorization'] = savedToken;
        }
    }

    public setAuthToken(token: string): void {
        if (!token) return;
        this.dynamicHeaders['Authorization'] = token;
        localStorage.setItem(this.AUTH_STORAGE_KEY, token);
        console.log('[HHJGBIM_Enhance] 鉴权模块: 已成功提取并持久化 Authorization 令牌');
    }

    public updateHeaders(key: string, value: string): void {
        const lowerKey = key.toLowerCase();
        
        if (lowerKey === 'authorization') {
            if (this.dynamicHeaders['Authorization'] !== value) {
                this.dynamicHeaders['Authorization'] = value;
                localStorage.setItem(this.AUTH_STORAGE_KEY, value);
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

    public getHeaders(): Record<string, string> {
        return this.dynamicHeaders;
    }

    public clearAuth(): void {
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
    }
}

export const authService = new AuthService();
