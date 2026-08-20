import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { settings } from '../config/settings';

/**
 * @class SystemService
 * @description 本地爬虫微服务的系统控制面：探活、运行指标上报与初始化任务触发，均附带 15s 探活结果缓存。
 */
class SystemService {
    private cachedPingStatus: boolean | null = null;
    private lastPingTime: number = 0;
    private readonly PING_CACHE_TTL = 15000;
    
    /**
     * @method submitSystemReport
     * @description 上报系统运行指标（含抓取时间戳）至爬虫服务。
     * @param {Record<string, any>} [payload={}] 上报载荷
     * @returns {Promise<any>} 上报结果，失败返回 null
     */
    public async submitSystemReport(payload: Record<string, any> = {}): Promise<any> {
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_REPORT_PATH}`;
        return await GMHttpClient.postWithAuth(url, payload);
    }

    /**
     * @method ping
     * @description 探活本地爬虫微服务。15s 内缓存探活结论，短路重复请求；force 可强制穿透缓存。
     * @param {Record<string, any>} [params={}] 探活载荷
     * @param {boolean} [force=false] 是否强制跳过缓存执行真实通讯
     * @returns {Promise<any>} 探活响应，失败返回 null
     */
    public async ping(params: Record<string, any> = {}, force: boolean = false): Promise<any> {
        const now = Date.now();
        
        if (!force && this.cachedPingStatus !== null && (now - this.lastPingTime < this.PING_CACHE_TTL)) {
            if (!this.cachedPingStatus) {
                return null;
            }
            return { status: 'success', _cached: true };
        }

        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_PING_PATH}`;
        const response = await GMHttpClient.postWithAuth(url, params);
        
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
     * @description 触发爬虫微服务的全量数据初始化任务。
     * @param {Record<string, any>} [params={}] 初始化指令载荷
     * @returns {Promise<any>} 任务受理结果（含 taskId），失败返回 null
     */
    public async systemInt(params: Record<string, any> = {}): Promise<any> {
        const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_SYSTEM_INT_PATH}`;
        return await GMHttpClient.postWithAuth(url, params);
    }
}

export const systemService = new SystemService();
