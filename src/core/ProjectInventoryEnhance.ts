import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { BimProjectItem, PlmEntityItem } from '../types';
import { NetworkHook } from './NetworkHook';

/**
 * @class ProjectInventoryEnhance
 * @description 仓储项目数据清洗注入类。负责将 PLM 系统的数据状态映射注入到仓库数据视图中。
 */
export class ProjectInventoryEnhance {
    /**
     * @method injectTargetData
     * @description 执行核心业务数据清洗与合并。
     * @param {any} warehouseJson 原始仓储 API 响应数据
     * @param {any} plmJson 预加载的 PLM 系统实体数据
     * @returns {any} 清洗篡改后的响应数据体
     */
    private injectTargetData(warehouseJson: any, plmJson: any): any {
        try {
            if (!plmJson || !warehouseJson) return warehouseJson;

            const plmItems: PlmEntityItem[] = plmJson?.Data?.Data || plmJson?.Data || [];
            const warehouseItems: BimProjectItem[] = warehouseJson?.Data?.Data || [];

            if (warehouseItems.length === 0 || plmItems.length === 0) return warehouseJson;

            const stateMap = new Map<string, string>();
            plmItems.forEach(item => {
                const key = item.Short_Name || item.Project_Name;
                if (key && item.State_Name !== undefined) {
                    stateMap.set(key, item.State_Name);
                }
            });

            warehouseItems.forEach(item => {
                if (item?.Project_Name) {
                    if (stateMap.has(item.Project_Name)) {
                        item.State_Name = stateMap.get(item.Project_Name)!;
                    } else {
                        if (!item.State_Name || String(item.State_Name) === '0') {
                            item.State_Name = '未知';
                        }
                    }
                }
            });
            return warehouseJson;
        } catch (error) {
            console.error('[HHJGBIM_Enhance] 数据清洗异常，执行静默降级:', error);
            return warehouseJson;
        }
    }

    /**
     * @method init
     * @description 初始化挂载拦截器。采用严格路径解析校验，取代脆弱的模糊匹配。
     * @returns {void}
     */
    public init(): void {
        NetworkHook.getInstance().registerResponseInterceptor({
            urlMatcher: (url: string) => {
                try {
                    // 构建标准化 URL 对象以剥离 Query 参数干扰
                    const requestUrl = new URL(url, window.location.origin);
                    const targetUrl = new URL(API_URLS.WAREHOUSE_DATA_STATS);
                    // 严格校验 pathname 确保靶向准确性
                    return requestUrl.pathname === targetUrl.pathname;
                } catch (error) {
                    // 可信度/兼容性存疑：处理相对路径残缺等异常网络请求特征
                    return false; 
                }
            },
            beforeRequest: () => projectService.fetchProjectEntities(),
            handler: (originalJson: any, prefetchData: any) => {
                return this.injectTargetData(originalJson, prefetchData);
            }
        });
        console.log('[HHJGBIM_Enhance] 数据清洗增强服务已注册 (安全模式)');
    }
}
