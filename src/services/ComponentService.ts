import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class ComponentService
 * @description 构件业务逻辑驱动器。封装构件关联的高阶运算接口调度。
 */
class ComponentService {
    
    /**
     * @method getYearWeight
     * @description 获取目标构件的年度权重分配数据。
     * @param {Record<string, any>} [params] 参数载荷预留入口
     * @returns {Promise<any>}
     */
    public async getYearWeight(params: Record<string, any> = {}): Promise<any> {
        await authService.waitForToken();
        
        // 动态组装完整 URL
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_COMPONENT_WEIGHT_PATH}`;
        const response = await GMHttpClient.post(url, params);
        
        if (!response) {
            console.warn('[HHJGBIM_Enhance] 构件权重服务响应异常');
            return null;
        }
        
        console.log('[HHJGBIM_Enhance] 构件权重分配获取成功');
        return response;
    }

    /**
     * @method getMonthWeight
     * @description 获取指定月份与创建人的构件权重分配数据。
     * @param {string} [month] 可选，目标月份 (YYYY-MM)，缺省由服务端回落为当前月
     * @param {string} [createUser] 可选，按组件创建人姓名精确过滤
     * @returns {Promise<any>} 返回月度数据结构的 JSON 对象
     */
    public async getMonthWeight(month?: string, createUser?: string): Promise<any> {
        await authService.waitForToken();
        
        let url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_COMPONENT_MONTH_WEIGHT_PATH}`;
        
        // 构建 Query 参数链以兼容后端 FastAPI 的 Query 注入标准
        const queryParams = new URLSearchParams();
        if (month) queryParams.append('month', month);
        if (createUser) queryParams.append('createUser', createUser);
        
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        
        // 发起跨域 POST 提权请求 (Body 维持空载荷)
        const response = await GMHttpClient.post(url, {});
        
        if (!response) {
            console.warn('[HHJGBIM_Enhance] 构件月度权重服务响应异常');
            return null;
        }
        
        console.log('[HHJGBIM_Enhance] 构件月度权重分配获取成功');
        return response;
    }
}

export const componentService = new ComponentService();
