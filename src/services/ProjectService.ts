import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';

/**
 * @class ProjectService
 * @description 项目业务调度中心。提供项目数据获取及多级容灾降级服务。
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
     * @description 获取项目实体聚合数据。优先请求本地接口，遇阻则降级至线上系统。
     * @returns {Promise<any>}
     */
    public async fetchProjectEntities(): Promise<any> {
        if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
        if (this.fetchPromise) return this.fetchPromise;

        await authService.waitForToken();

        this.fetchPromise = this.executeFetchStrategy().then(json => {
            if (json) {
                this.cachedPlmJson = json;
                console.log('[HHJGBIM_Enhance] 实体数据加载完毕');
            } else {
                this.fetchPromise = null; 
            }
            return json;
        });

        return this.fetchPromise;
    }

    /**
     * @method executeFetchStrategy
     * @description 执行带熔断机制的阶梯请求策略。
     * @returns {Promise<any>}
     * @private
     */
    private async executeFetchStrategy(): Promise<any> {
        try {
            const localData = await this.fetchLocalInfo(3000);
            if (localData && Array.isArray(localData) && localData.length > 0) {
                console.log('[HHJGBIM_Enhance] 命中本地项目服务');
                return { Data: localData };
            }
        } catch (error) {
            console.warn('[HHJGBIM_Enhance] 本地服务失联，已切至线上兜底');
        }

        return await GMHttpClient.post(API_URLS.PLM_PROJECT_ENTITIES, this.defaultPayload);
    }

    /**
     * @method fetchLocalInfo
     * @description 向本地环境下发探测请求。
     * @param {number} timeoutMs 熔断阈值（毫秒）
     * @returns {Promise<any>}
     * @private
     */
    private fetchLocalInfo(timeoutMs: number): Promise<any> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(null);
            }, timeoutMs);

            GMHttpClient.post(API_URLS.LOCAL_PROJECT_INFO, {}).then(res => {
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
