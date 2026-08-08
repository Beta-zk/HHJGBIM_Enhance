/**
 * 项目业务服务类
 * 负责获取及缓存 PLM 系统相关的项目实体数据。
 */
import { API_URLS } from '../config/constants';
import { HttpService } from '../core/HttpService';
import { authService } from './AuthService';

class ProjectService {
    private cachedPlmJson: any = null;
    private fetchPromise: Promise<any> | null = null;

    private readonly defaultPayload = {
        Page: 1,
        PageSize: 100
    };

    public async fetchProjectEntities(): Promise<any> {
        if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
        if (this.fetchPromise) return this.fetchPromise;

        await authService.waitForToken();

        this.fetchPromise = HttpService.post(API_URLS.PLM_PROJECT_ENTITIES, this.defaultPayload)
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
