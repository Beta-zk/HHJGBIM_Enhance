import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class ComponentService
 * @description 构件数据链路仓。面向本地爬虫微服务提供隔离化的异步调度模型，规避对原始宿主接口的高频访问压力。
 */
class ComponentService {
    
    /**
     * @method getYearWeight
     * @description 投递异步查询，获取构件域在全量时间轴下的权重矩阵。
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    public async getYearWeight(params: Record<string, any> = {}): Promise<any> {
        await authService.waitForToken();
        
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_COMPONENT_WEIGHT_PATH}`;
        const response = await GMHttpClient.post(url, params);
        
        if (!response) {
            return null;
        }
        return response;
    }

    /**
     * @method getMonthWeight
     * @description 提供复合维度的检索映射接口，输出构件周期态势。
     * @param {string} [month] 统计周期 (YYYY-MM)
     * @param {string} [createUser] 指标执行人
     * @returns {Promise<any>}
     */
    public async getMonthWeight(month?: string, createUser?: string): Promise<any> {
        await authService.waitForToken();
        
        let url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_COMPONENT_MONTH_WEIGHT_PATH}`;
        
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (createUser) queryParams.append('createUser', createUser);
        
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        
        const response = await GMHttpClient.post(url, {});
        
        if (!response) {
            return null;
        }
        return response;
    }
}

export const componentService = new ComponentService();
