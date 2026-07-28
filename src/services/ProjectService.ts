import { PLM_PROJECT_ENTITIES_URL, DEFAULT_REQUEST_PAYLOAD } from '../config/constants';
import { authService } from './AuthService';
import { showToast } from '../utils/helpers';

declare const GM_xmlhttpRequest: any;

class ProjectService {
    private cachedPlmJson: any = null;
    private fetchPromise: Promise<any> | null = null;

    public fetchProjectEntities(): Promise<any> {
        if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
        if (this.fetchPromise) return this.fetchPromise;

        this.fetchPromise = new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: PLM_PROJECT_ENTITIES_URL,
                headers: authService.getHeaders(),
                data: JSON.stringify(DEFAULT_REQUEST_PAYLOAD),
                withCredentials: true,
                onload: (response: any) => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const json = JSON.parse(response.responseText);
                            if (json && json.StatusCode === 401) {
                                console.warn('[HHJGBIM_Enhance] ProjectService: Token已过期');
                                authService.clearAuth();
                                this.fetchPromise = null;
                                showToast(`⚠️ 鉴权已过期，脚本将在下次操作重试`, false);
                                resolve(null);
                                return;
                            }
                            this.cachedPlmJson = json; // 缓存完整 JSON
                            resolve(json);
                        } catch {
                            showToast(`❌ 项目状态响应解析失败`, false);
                            resolve(null);
                        }
                    } else {
                        showToast(`❌ 项目状态请求失败 (HTTP ${response.status})`, false);
                        resolve(null);
                    }
                },
                onerror: () => {
                    showToast(`❌ 网络异常或跨域受阻`, false);
                    resolve(null);
                }
            });
        });

        return this.fetchPromise;
    }
}

export const projectService = new ProjectService();
