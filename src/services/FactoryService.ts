import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';

/**
 * @class FactoryService
 * @description 工厂产能聚合服务。封装针对生产看板业务的数据拉取接口。
 */
class FactoryService {
    public async fetchMonthlyOutput(year?: string): Promise<any> {
        await authService.waitForToken();
        
        const targetYear = year || new Date().getFullYear().toString();
        const payload = { year: targetYear };
        
        return await GMHttpClient.post(API_URLS.MONTHLY_FACTORY_OUTPUT, payload);
    }
}

export const factoryService = new FactoryService();
