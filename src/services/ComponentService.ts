import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';

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
        const response = await GMHttpClient.post(API_URLS.LOCAL_COMPONENT_WEIGHT, params);
        
        if (!response) {
            console.warn('[HHJGBIM_Enhance] 构件权重服务响应异常');
            return null;
        }
        
        console.log('[HHJGBIM_Enhance] 构件权重分配获取成功');
        return response;
    }
}

export const componentService = new ComponentService();
