import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class ComponentService
 * @description 构件域聚合服务。屏蔽底层 HTTP 通信细节，提供面向构件等多维数据的微服务级业务调度接口。
 */
class ComponentService {
    
    /**
     * @method getYearWeight
     * @description 获取目标构件年度权重聚合分布矩阵。
     * @param {Record<string, any>} [params] 参数载荷
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
     * @description 按月度与人员下钻查询构件权重视图数据。
     * @param {string} [month] 目标月份 (YYYY-MM)
     * @param {string} [createUser] 组件责任人
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
