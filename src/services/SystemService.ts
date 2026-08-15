import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';

/**
 * @class SystemService
 * @description 系统级控制面。封装针对外部微服务架构的健康度评估（Ping/HealthCheck）与底层运行时指令的分发投递。
 */
class SystemService {
    private cachedPingStatus: boolean | null = null;
    private lastPingTime: number = 0;
    private readonly PING_CACHE_TTL = 15000;
    
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
     * @description 派发 RPC 探活信号，验证远程资源就绪态。引入短路熔断机制（Circuit Breaker）与缓存，依赖原生网络响应。
     * @param {Record<string, any>} [params={}] 
     * @param {boolean} [force=false] 是否强制跳过缓存执行真实通讯
     * @returns {Promise<any>}
     */
    public async ping(params: Record<string, any> = {}, force: boolean = false): Promise<any> {
        const now = Date.now();
        
        if (!force && this.cachedPingStatus !== null && (now - this.lastPingTime < this.PING_CACHE_TTL)) {
            if (!this.cachedPingStatus) {
                return null;
            }
            return { status: 'success', _cached: true };
        }

        await authService.waitForToken();
        
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_PING_PATH}`;
        
        // 彻底移除 setTimeout 与 Promise.race，直接等待底层网络抛出异常或返回
        const response = await GMHttpClient.post(url, params);
        
        this.lastPingTime = Date.now();
        if (!response) {
            this.cachedPingStatus = false;
            return null;
        }
        
        this.cachedPingStatus = true;
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
