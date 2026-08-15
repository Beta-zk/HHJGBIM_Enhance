import { API_URLS } from "../config/constants";
import { GMHttpClient } from "../core/GMHttpClient";
import { authService } from "./AuthService";
import { settings } from "../config/settings";
import { systemService } from "./SystemService";

/**
 * @class ProjectService
 * @description 实体状态同步网关。内建单一职责的单例内存级缓存（Memoization）与并发闭锁，规避雪崩效应并执行容灾链路切换。
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
   * @returns {Promise<any>}
   */
  public async fetchProjectEntities(): Promise<any> {
    if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
    if (this.fetchPromise) return this.fetchPromise;

    await authService.waitForToken();

    this.fetchPromise = this.executeFetchStrategy().then((json) => {
      if (json) {
        this.cachedPlmJson = json;
      } else {
        this.fetchPromise = null;
      }
      return json;
    });

    return this.fetchPromise;
  }

  private async executeFetchStrategy(): Promise<any> {
    try {
      const pingOk = await systemService.ping().catch(() => null);
      
      if (pingOk) {
          const localData = await this.fetchLocalInfo(3000);
          if (localData && Array.isArray(localData) && localData.length > 0) {
            return { Data: localData };
          }
      } else {
          console.warn("[Service] Ping 探活未响应，直接执行宿主云端降级");
      }
    } catch (error) {
      console.warn("[Service] 链路降级: PLM_ProjectEntities");
    }

    return await GMHttpClient.post(
      API_URLS.PLM_PROJECT_ENTITIES,
      this.defaultPayload,
    );
  }

  private fetchLocalInfo(timeoutMs: number): Promise<any> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(null);
      }, timeoutMs);

      const url = `${settings.get().crawlerDomain}${API_URLS.LOCAL_PROJECT_INFO_PATH}`;

      GMHttpClient.post(url, {})
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(() => {
          clearTimeout(timer);
          resolve(null);
        });
    });
  }
}

export const projectService = new ProjectService();
