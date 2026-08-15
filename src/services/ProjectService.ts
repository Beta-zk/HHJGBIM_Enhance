import { API_URLS } from "../config/constants";
import { GMHttpClient } from "../core/GMHttpClient";
import { authService } from "./AuthService";
import { settings } from "../config/settings";

/**
 * @class ProjectService
 * @description 实体状态同步网关。接受外部路由调度，执行严谨的并发闭锁，全量剔除应用层延时干预。
 */
class ProjectService {
  private cachedPlmJson: any = null;
  private fetchPromise: Promise<any> | null = null;

  private readonly defaultPayload = {
    PageInfo: { Page: 1, PageSize: 100, SortName: "", SortOrder: "" },
  };

  /**
   * @method fetchProjectEntities
   * @description 获取全局实体字典。多实例并发调用时仅激活单一通讯线程。
   * @param {boolean} [useLocal=false] 是否启用本地爬虫数据源
   * @returns {Promise<any>}
   */
  public async fetchProjectEntities(useLocal: boolean = false): Promise<any> {
    if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
    if (this.fetchPromise) return this.fetchPromise;

    await authService.waitForToken();

    this.fetchPromise = this.executeFetchStrategy(useLocal).then((json) => {
      if (json) {
        this.cachedPlmJson = json;
      } else {
        this.fetchPromise = null;
      }
      return json;
    });

    return this.fetchPromise;
  }

  private async executeFetchStrategy(useLocal: boolean): Promise<any> {
    if (useLocal) {
        try {
            const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_PROJECT_INFO_PATH}`;
            const localData = await GMHttpClient.post(url, {});
            if (localData && Array.isArray(localData) && localData.length > 0) {
              return { Data: localData };
            }
        } catch (error) {
            console.warn("[Service] 链路降级: PLM_ProjectEntities");
        }
    }

    return await GMHttpClient.post(
      API_URLS.PLM_PROJECT_ENTITIES,
      this.defaultPayload,
    );
  }
}

export const projectService = new ProjectService();
