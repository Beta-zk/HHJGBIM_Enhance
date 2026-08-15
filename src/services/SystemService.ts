import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class SystemService
 * @description 系统级控制面。封装针对外部微服务架构的健康度评估（Ping/HealthCheck）与底层运行时指令的分发投递。
 */
class SystemService {
    
    /**
     * @method submitSystemReport
     * @description 执行系统运行指标的投递归档。
     * @param {Record<string, any>} [payload={}] 
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
     * @description 派发 RPC 探活信号，验证远程资源就绪态。内建 3000ms 强制超时拦截。
     * @param {Record<string, any>} [params={}] 
     * @returns {Promise<any>}
     */
    public async ping(params: Record<string, any> = {}): Promise<any> {
        await authService.waitForToken();
        
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_PING_PATH}`;
        
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.warn('[SystemService] Ping 探活超时 (3000ms) 熔断');
                resolve(null);
            }, 3000);
        });

        const requestPromise = GMHttpClient.post(url, params);
        
        const response = await Promise.race([requestPromise, timeoutPromise]);
        
        if (!response) {
            return null;
        }
        return response;
    }

    /**
     * @method systemInt
     * @description 发起系统环境或扩展模块的初始约束指派。
     * @param {Record<string, any>} [params={}] 
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
