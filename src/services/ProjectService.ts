import { API_URLS } from "../config/constants";
import { GMHttpClient } from "../core/GMHttpClient";
import { settings } from "../config/settings";

/**
 * @class ProjectService
 * @description 项目实体字典网关。向宿主或本地爬虫源拉取 PLM 项目实体，
 * 提供并发闭锁（并发调用共享同一请求）与结果缓存，避免重复通讯。
 */
class ProjectService {
  private cachedPlmJson: any = null;
  private fetchPromise: Promise<any> | null = null;

  /**
   * @constant PROJECT_STATUS_DICT_CODE
   * @description 项目状态字典编码，GetDictionaryDetailListByCode 的请求标识（宿主字典管理中的 project_status 字典）。
   */
  private readonly PROJECT_STATUS_DICT_CODE = 'project_status';

  // ==================== [备用] 旧接口载荷：PLM_Projects/GetEntities ====================
  // 原项目实体分页载荷，2026-09-01 切换 GetDictionaryDetailListByCode 字典源后停用，保留以备回退：
  // private readonly defaultPayload = {
  //   PageInfo: { Page: 1, PageSize: 100, SortName: "", SortOrder: "" },
  // };
  // ================================================================================

  /**
   * @method fetchProjectEntities
   * @description 获取全局实体字典。多实例并发调用时仅激活单一通讯线程。
   * @param {boolean} [useLocal=false] 是否启用本地爬虫数据源
   * @returns {Promise<any>}
   */
  public async fetchProjectEntities(useLocal: boolean = false): Promise<any> {
    if (this.cachedPlmJson) return Promise.resolve(this.cachedPlmJson);
    if (this.fetchPromise) return this.fetchPromise;

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
            const localData = await GMHttpClient.postWithAuth(url, {});
            if (localData && Array.isArray(localData) && localData.length > 0) {
              return { Data: localData };
            }
        } catch {
            console.warn("[Service] 链路降级: PLM_ProjectEntities");
        }
    }

    // ==================== [备用] 旧接口：PLM_Projects/GetEntities ====================
    // 原分页实体接口，2026-09-01 切换 GetDictionaryDetailListByCode 字典源后停用，保留以备回退：
    // return await GMHttpClient.postWithAuth(API_URLS.PLM_PROJECT_ENTITIES, this.defaultPayload);
    // ================================================================================

    return await GMHttpClient.postWithAuth(
      API_URLS.PLM_PROJECT_DICTIONARY,
      { dictionaryCode: this.PROJECT_STATUS_DICT_CODE },
    );
  }
}

export const projectService = new ProjectService();
