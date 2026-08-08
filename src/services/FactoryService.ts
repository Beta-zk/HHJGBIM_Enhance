/**
 * 工厂数据服务类
 */
import { API_URLS } from '../config/constants';
import { HttpService } from '../core/HttpService';
import { authService } from './AuthService';

class FactoryService {
    public async fetchMonthlyOutput(year?: string): Promise<any> {
        await authService.waitForToken();
        
        const targetYear = year || new Date().getFullYear().toString();
        const payload = { year: targetYear };
        
        // 更新点：使用 API_URLS.MONTHLY_FACTORY_OUTPUT
        return await HttpService.post(API_URLS.MONTHLY_FACTORY_OUTPUT, payload);
    }
}

export const factoryService = new FactoryService();
