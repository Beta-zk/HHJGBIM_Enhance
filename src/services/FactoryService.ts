import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { settings } from '../config/settings';

/**
 * @class FactoryService
 * @description 工厂产能数据网关。拉取月度综合产出指标，优先走本地爬虫链路，失败时降级到宿主接口。
 */
class FactoryService {

    /**
     * @method fetchMonthlyOutput
     * @description 拉取月度综合产出指标：本地链路返回空时自动降级到宿主接口。
     * @param {string} [year] 指定年份
     * @param {boolean} [useLocal=false] 是否启用本地爬虫链路
     * @returns {Promise<any>}
     */
    public async fetchMonthlyOutput(year?: string, useLocal: boolean = false): Promise<any> {
        const targetYear = year || new Date().getFullYear().toString();
        const payload = { year: targetYear };

        if (useLocal) {
            try {
                const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_FACTORY_YEAR_OUTPUT_PATH}`;
                const localData = await GMHttpClient.postWithAuth(url, payload);
                if (localData && Object.keys(localData).length > 0) {
                    return localData;
                }
            } catch {
                console.warn('[Service] 本地链路异常，触发降级策略: FactoryOutput');
            }
        }

        return await GMHttpClient.postWithAuth(API_URLS.MONTHLY_FACTORY_OUTPUT, payload);
    }
}

export const factoryService = new FactoryService();
