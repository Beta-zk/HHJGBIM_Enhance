/**
 * 项目业务服务类
 * 负责获取及缓存 PLM 系统相关的项目实体数据。
 */
import { PLM_PROJECT_ENTITIES_URL } from '../config/constants';
import { HttpService } from '../core/HttpService';
import { authService } from './AuthService';
import { RequestPayload } from '../types';

class ProjectService {
    private cachedPlmJson: any = null;
    private fetchPromise: Promise<any> | null = null;

    /**
     * @description 默认分页请求载荷（私有业务配置）
     */
    private readonly defaultPayload: RequestPayload = {
        Page: 1,
        PageSize: -1
    };

    /**
     * 拉取项目实体列表
     * 具备并发防护与内存级单例缓存机制，调用前强制等待最新鉴权 Token。
     * @returns {Promise<any>} 项目实体数据 JSON 对象或 null
     */
    public async fetchProjectEntities(): Promise<any> {
        if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
        if (this.fetchPromise) return this.fetchPromise;

        await authService.waitForToken();

        this.fetchPromise = HttpService.post(PLM_PROJECT_ENTITIES_URL, this.defaultPayload)
            .then(json => {
                if (json) {
                    this.cachedPlmJson = json;
                } else {
                    this.fetchPromise = null; 
                }
                return json;
            });

        return this.fetchPromise;
    }
}

export const projectService = new ProjectService();
