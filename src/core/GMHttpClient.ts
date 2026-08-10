import { authService } from '../services/AuthService';

declare const GM_xmlhttpRequest: any;

/**
 * @class GMHttpClient
 * @description 跨域 HTTP 请求客户端。封装底层沙盒提权 API，提供主动网络请求能力。
 */
export class GMHttpClient {
    /**
     * @method post
     * @description 执行特权跨域 POST 请求。
     * @param {string} url 目标寻址
     * @param {any} payload 载荷体
     * @returns {Promise<any>}
     */
    public static async post(url: string, payload: any): Promise<any> {
        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                console.error('[HHJGBIM_Enhance] 致命环境异常: GM_xmlhttpRequest 未授权或缺失。');
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
                                console.warn(`[HHJGBIM_Enhance] 鉴权逾期异常 | 目标接口: ${url}`);
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
