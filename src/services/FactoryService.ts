import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class FactoryService
 * @description 工厂级产能调度器。执行由调用方约束的路由切换，全量剔除应用层延时干预。
 */
class FactoryService {
    
    /**
     * @method fetchMonthlyOutput
     * @description 拉取月度综合产出指标。
     * @param {string} [year] 指定年份
     * @param {boolean} [useLocal=false] 是否启用本地爬虫链路
     * @returns {Promise<any>}
     */
    public async fetchMonthlyOutput(year?: string, useLocal: boolean = false): Promise<any> {
        await authService.waitForToken();
        
        const targetYear = year || new Date().getFullYear().toString();
        const payload = { year: targetYear };

        if (useLocal) {
            try {
                const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_FACTORY_YEAR_OUTPUT_PATH}`;
                const localData = await GMHttpClient.post(url, payload);
                if (localData && Object.keys(localData).length > 0) {
                    return localData;
                }
            } catch (error) {
                console.warn('[Service] 本地链路异常，触发降级策略: FactoryOutput');
            }
        }
        
        return await GMHttpClient.post(API_URLS.MONTHLY_FACTORY_OUTPUT, payload);
    }
}

export const factoryService = new FactoryService();
