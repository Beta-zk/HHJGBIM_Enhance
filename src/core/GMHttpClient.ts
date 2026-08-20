import { authService } from '../services/AuthService';

declare const GM_xmlhttpRequest: any;

/**
 * @class GMHttpClient
 * @description 特权网络客户端。基于沙盒提权机制执行跨域通讯，内置 HTTP 401 状态监听与鉴权凭证的自动化熔断处理。
 */
export class GMHttpClient {
    /**
     * @method post
     * @description 执行 POST 提权请求，自动反序列化响应体并实施鉴权状态审计。
     * @param {string} url 目标绝对寻址
     * @param {any} payload 数据载荷
     * @returns {Promise<any>} 反序列化后的响应体，失败或 401 熔断时返回 null
     */
    public static async post(url: string, payload: any): Promise<any> {
        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                console.error('[Network] 提权环境缺失，GM_xmlhttpRequest 未注册');
                resolve(null);
                return;
            }

            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: authService.getHeaders(),
                data: JSON.stringify(payload),
                withCredentials: true,
                onload: (response: any) => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const json = JSON.parse(response.responseText);
                            if (json && json.StatusCode === 401) {
                                console.warn(`[Network] 鉴权凭证失效，触发熔断: ${url}`);
                                authService.clearAuth();
                                resolve(null);
                                return;
                            }
                            resolve(json);
                        } catch (error) {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                },
                onerror: () => {
                    resolve(null);
                }
            });
        });
    }

    /**
     * @method postWithAuth
     * @description 带凭证就绪约束的 POST：先闭锁等待鉴权凭证就绪，再执行提权请求。
     * 数据服务统一走此入口，收敛「waitForToken + post + 空响应归一化」的重复链路。
     * @param {string} url 目标绝对寻址
     * @param {any} [payload={}] 数据载荷
     * @returns {Promise<any>} 反序列化后的响应体，失败返回 null
     */
    public static async postWithAuth(url: string, payload: any = {}): Promise<any> {
        await authService.waitForToken();
        return await GMHttpClient.post(url, payload);
    }
}
