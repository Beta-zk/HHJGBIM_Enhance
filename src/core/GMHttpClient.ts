import { authService } from '../services/AuthService';

declare const GM_xmlhttpRequest: any;

/**
 * @class GMHttpClient
 * @description 沙盒提权 HTTP 客户端，绕过原生同源策略，负责全量跨域通信，集成自动鉴权拦截与状态机联动。
 */
export class GMHttpClient {
    /**
     * @method post
     * @description 发起特权 POST 通讯，内置 401 态自动清理鉴权凭证逻辑。
     * @param {string} url 目标绝对寻址
     * @param {any} payload 数据载荷
     * @returns {Promise<any>} 反序列化响应体
     */
    public static async post(url: string, payload: any): Promise<any> {
        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                console.error('[Network] GM_xmlhttpRequest 未授权');
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
                                console.warn(`[Network] 鉴权逾期: ${url}`);
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
}
