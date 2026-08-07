/**
 * 工厂数据服务类
 * 提供底层鉴权挂起机制：调用本类方法时，若系统尚未捕获有效凭证，内部会自动挂起等待，
 * 确保真实发出的网络请求百分百携带最新 Token。
 */
import { MONTHLY_FACTORY_OUTPUT, DEFAULT_REQUEST_PAYLOAD } from '../config/constants';
import { HttpService } from '../core/HttpService';
import { authService } from './AuthService';

class FactoryService {
    /**
     * 查询月度工厂产值数据
     * @returns 月度产值 JSON 对象或 null。内部已封装鉴权就绪保障。
     */
    public async fetchMonthlyOutput(): Promise<any> {
        // 核心防御：在此处静默拦截并等待有效 Token，阻断过早的主动调用
        await authService.waitForToken();
        
        return await HttpService.post(MONTHLY_FACTORY_OUTPUT, DEFAULT_REQUEST_PAYLOAD);
    }
}

export const factoryService = new FactoryService();
