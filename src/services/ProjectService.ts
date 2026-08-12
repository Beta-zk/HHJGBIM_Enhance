import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class ProjectService
 * @description 项目实体聚合服务。内置请求熔断与双链路容灾策略，确保本地爬虫与线上兜底服务的平滑切换。
 */
class ProjectService {
    private cachedPlmJson: any = null;
    private fetchPromise: Promise<any> | null = null;

    private readonly defaultPayload = {
        Page: 1,
        PageSize: 100
    };

    /**
     * @method fetchProjectEntities
     * @description 拉取项目实体池数据，含内存级缓存防护机制。
     * @returns {Promise<any>}
     */
    public async fetchProjectEntities(): Promise<any> {
        if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
        if (this.fetchPromise) return this.fetchPromise;

        await authService.waitForToken();

        this.fetchPromise = this.executeFetchStrategy().then(json => {
            if (json) {
                this.cachedPlmJson = json;
            } else {
                this.fetchPromise = null; 
            }
            return json;
        });

        return this.fetchPromise;
    }

    /**
     * @method executeFetchStrategy
     * @description 调度多级网络降级链路。
     * @returns {Promise<any>}
     * @private
     */
    private async executeFetchStrategy(): Promise<any> {
        try {
            const localData = await this.fetchLocalInfo(3000);
            if (localData && Array.isArray(localData) && localData.length > 0) {
                console.log('[Service] 启用本地微服务链路');
                return { Data: localData };
            }
        } catch (error) {
            console.warn('[Service] 链路降级至云端');
        }

        return await GMHttpClient.post(API_URLS.PLM_PROJECT_ENTITIES, this.defaultPayload);
    }

    /**
     * @method fetchLocalInfo
     * @description 向局域网爬虫下探并配置熔断超时管控。
     * @param {number} timeoutMs 熔断阈值（毫秒）
     * @returns {Promise<any>}
     * @private
     */
    private fetchLocalInfo(timeoutMs: number): Promise<any> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(null);
            }, timeoutMs);

            const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_PROJECT_INFO_PATH}`;

            GMHttpClient.post(url, {}).then(res => {
                clearTimeout(timer);
                resolve(res);
            }).catch(() => {
                clearTimeout(timer);
                resolve(null);
            });
        });
    }
}

export const projectService = new ProjectService();
