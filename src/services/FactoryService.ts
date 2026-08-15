import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';
import { settings } from '../config/settings';
import { systemService } from './SystemService';

/**
 * @class FactoryService
 * @description 工厂级产能调度器。核心设计融入请求熔断（Circuit Breaker）原则，提供由本地微服务至云端宿主的双轨降级。
 */
class FactoryService {
    
    /**
     * @method fetchMonthlyOutput
     * @description 拉取月度综合产出指标。优先验证局域网高速链路的完备性，失效则执行主线降级保护。
     * @param {string} [year] 指定年份
     * @returns {Promise<any>}
     */
    public async fetchMonthlyOutput(year?: string): Promise<any> {
        await authService.waitForToken();
        
        const targetYear = year || new Date().getFullYear().toString();
        const payload = { year: targetYear };

        try {
            const pingOk = await systemService.ping().catch(() => null);
            
            if (pingOk) {
                const localData = await this.fetchLocalFactoryOutput(payload, 3000);
                if (localData && Object.keys(localData).length > 0) {
                    return localData;
                }
            } else {
                console.warn('[Service] Ping 探活未响应，跳过本地链路直接降级');
            }
        } catch (error) {
            console.warn('[Service] 本地链路异常，触发降级策略: FactoryOutput');
        }
        
        return await GMHttpClient.post(API_URLS.MONTHLY_FACTORY_OUTPUT, payload);
    }

    private fetchLocalFactoryOutput(payload: Record<string, any>, timeoutMs: number): Promise<any> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(null);
            }, timeoutMs);

            const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_FACTORY_YEAR_OUTPUT_PATH}`;

            GMHttpClient.post(url, payload).then(res => {
                clearTimeout(timer);
                resolve(res);
            }).catch(() => {
                clearTimeout(timer);
                resolve(null);
            });
        });
    }
}

export const factoryService = new FactoryService();
