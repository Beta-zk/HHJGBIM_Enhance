import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { settings } from '../config/settings';

/**
 * @class ComponentService
 * @description 构件深化重量数据网关。面向本地爬虫微服务提供年度/月度权重查询，避免高频访问宿主接口。
 */
class ComponentService {

    /**
     * @method getYearWeight
     * @description 查询构件域在全量时间轴下的年度权重矩阵。
     * @param {Record<string, any>} [params={}] 查询载荷
     * @returns {Promise<any>} 权重矩阵数据，失败返回 null
     */
    public async getYearWeight(params: Record<string, any> = {}): Promise<any> {
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_COMPONENT_WEIGHT_PATH}`;
        return await GMHttpClient.postWithAuth(url, params);
    }

    /**
     * @method getMonthWeight
     * @description 按统计周期与执行人查询构件月度权重。
     * @param {string} [month] 统计周期 (YYYY-MM)
     * @param {string} [createUser] 指标执行人
     * @returns {Promise<any>} 月度权重数据，失败返回 null
     */
    public async getMonthWeight(month?: string, createUser?: string): Promise<any> {
        let url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_COMPONENT_MONTH_WEIGHT_PATH}`;

        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (createUser) queryParams.append('createUser', createUser);

        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        return await GMHttpClient.postWithAuth(url, {});
    }
}

export const componentService = new ComponentService();
