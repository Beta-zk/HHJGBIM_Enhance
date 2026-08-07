/**
 * 工厂数据服务类
 * 提供底层鉴权挂起机制：调用本类方法时，若系统尚未捕获有效凭证，内部会自动挂起等待，
 * 确保真实发出的网络请求百分百携带最新 Token。
 */
import { MONTHLY_FACTORY_OUTPUT } from '../config/constants';
import { HttpService } from '../core/HttpService';
import { authService } from './AuthService';

class FactoryService {
    /**
     * 查询月度工厂产值数据
     * @param {string} [year] - 查询年份，缺省则默认取当前系统年份
     * @returns {Promise<any>} 月度产值 JSON 对象或 null。内部已封装鉴权就绪保障。
     */
    public async fetchMonthlyOutput(year?: string): Promise<any> {
        await authService.waitForToken();
        
        const targetYear = year || new Date().getFullYear().toString();
        const payload = { year: targetYear };
        
        return await HttpService.post(MONTHLY_FACTORY_OUTPUT, payload);
    }
}

export const factoryService = new FactoryService();
