import { authService } from '../services/AuthService';
import { showToast } from '../utils/helpers';

declare const GM_xmlhttpRequest: any;

/**
 * @class HttpService
 * @description 全局 HTTP 请求中枢。专注生产环境下的请求调度与全量异常日志回显。
 */
export class HttpService {
    /**
     * @method post
     * @description 发送 POST 请求并统一处理响应及追踪异常。
     * @param {string} url 目标接口地址
     * @param {any} payload 请求主体载荷
     * @returns {Promise<any>} 解析完毕的 JSON 对象；若请求异常则静默返回 null。
     */
    public static async post(url: string, payload: any): Promise<any> {
        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                console.error('[HHJGBIM_Enhance] ❌ 致命环境异常: 未能获取到 GM_xmlhttpRequest。');
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
                            
                            /**
                             * @description 状态机自愈机制：当遭遇 401 拒绝时，静默清理本地缓存状态，
                             * 放弃越权的全局 UI 弹窗，将恢复权交由 AuthInterceptor 的下一次合法嗅探。
                             */
                            if (json && json.StatusCode === 401) {
                                console.warn(`[HHJGBIM_Enhance] ⚠️ 鉴权过期或被服务端顶号 | 目标接口: ${url}`);
                                authService.clearAuth();
                                resolve(null);
                                return;
                            }
                            resolve(json);
                        } catch (error) {
                            console.error(`[HHJGBIM_Enhance] ❌ JSON 反序列化失败 | 目标接口: ${url}`);
                            resolve(null);
                        }
                    } else {
                        console.error(`[HHJGBIM_Enhance] ❌ HTTP 通信异常 | 状态码: ${response.status}`);
                        resolve(null);
                    }
                },
                onerror: (error: any) => {
                    console.error(`[HHJGBIM_Enhance] ❌ 网络层跨域或连接熔断 | 目标接口: ${url}`);
                    resolve(null);
                }
            });
        });
    }
}
