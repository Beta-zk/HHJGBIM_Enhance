/**
 * 工厂数据服务类
 */
import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';

class FactoryService {
    public async fetchMonthlyOutput(year?: string): Promise<any> {
        await authService.waitForToken();
        
        const targetYear = year || new Date().getFullYear().toString();
        const payload = { year: targetYear };
        
        return await GMHttpClient.post(API_URLS.MONTHLY_FACTORY_OUTPUT, payload);
    }
}

export const factoryService = new FactoryService();
