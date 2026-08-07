/**
 * 全局 HTTP 请求中枢 (纯净 Build 版)
 * 专注生产环境下的请求调度与全量异常日志回显。
 */
import { authService } from '../services/AuthService';
import { showToast } from '../utils/helpers';

declare const GM_xmlhttpRequest: any;

export class HttpService {
    /**
     * 发送 POST 请求并统一处理响应及追踪异常
     * @param url 目标接口地址
     * @param payload 请求主体载荷
     * @returns 解析完毕的 JSON 对象；若请求异常则静默返回 null，并在控制台打印详细崩溃日志
     */
    public static async post(url: string, payload: any): Promise<any> {
        return new Promise((resolve) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                console.error('[HHJGBIM_Enhance] ❌ 致命环境异常: 未能获取到 GM_xmlhttpRequest，请确保脚本在油猴环境下运行并授予了相应权限。');
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
                                console.warn('[HHJGBIM_Enhance] ⚠️ 鉴权已过期 (StatusCode: 401)');
                                authService.clearAuth();
                                showToast('⚠️ 鉴权已过期，脚本将在下次操作重试', false);
                                resolve(null);
                                return;
                            }
                            resolve(json);
                        } catch (error) {
                            console.error(`[HHJGBIM_Enhance] ❌ JSON 反序列化失败 | 目标接口: ${url}`);
                            console.error('[HHJGBIM_Enhance] 📄 原始响应内容:', response.responseText);
                            console.error('[HHJGBIM_Enhance] 🐛 错误堆栈:', error);
                            resolve(null);
                        }
                    } else {
                        console.error(`[HHJGBIM_Enhance] ❌ HTTP 通信异常 | 目标接口: ${url}`);
                        console.error(`[HHJGBIM_Enhance] 📉 状态码: ${response.status} ${response.statusText}`);
                        console.error('[HHJGBIM_Enhance] 📄 服务器响应:', response.responseText);
                        resolve(null);
                    }
                },
                onerror: (error: any) => {
                    console.error(`[HHJGBIM_Enhance] ❌ 网络层跨域或连接熔断 | 目标接口: ${url}`);
                    console.error('[HHJGBIM_Enhance] 🐛 错误详情:', error);
                    resolve(null);
                }
            });
        });
    }
}
