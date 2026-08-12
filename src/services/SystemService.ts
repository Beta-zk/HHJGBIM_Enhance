import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class SystemService
 * @description 系统级聚合服务。封装针对底层微服务系统报告、探活等业务的数据拉取接口。
 */
class SystemService {
    
    /**
     * @method submitSystemReport
     * @description 提交或获取系统级报表数据。
     * @param {Record<string, any>} [payload={}] 报表请求或提交的参数载荷
     * @returns {Promise<any>} 
     */
    public async submitSystemReport(payload: Record<string, any> = {}): Promise<any> {
        await authService.waitForToken();
        
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_REPORT_PATH}`;
        const response = await GMHttpClient.post(url, payload);
        
        if (!response) {
            return null;
        }
        return response;
    }

    /**
     * @method ping
     * @description 触发系统探活请求，检查底层微服务连通性。
     * @param {Record<string, any>} [params={}] 探活参数载荷
     * @returns {Promise<any>}
     */
    public async ping(params: Record<string, any> = {}): Promise<any> {
        await authService.waitForToken();
        
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_PING_PATH}`;
        const response = await GMHttpClient.post(url, params);
        
        if (!response) {
            return null;
        }
        return response;
    }

    /**
     * @method systemInt
     * @description 触发微服务系统层级的初始化交互或特定指令。
     * @param {Record<string, any>} [params={}] 指令参数载荷
     * @returns {Promise<any>}
     */
    public async systemInt(params: Record<string, any> = {}): Promise<any> {
        await authService.waitForToken();
        
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_INT_PATH}`;
        const response = await GMHttpClient.post(url, params);
        
        if (!response) {
            return null;
        }
        return response;
    }
}

export const systemService = new SystemService();
