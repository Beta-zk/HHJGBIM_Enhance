import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { BimProjectItem, PlmEntityItem } from '../types';
import { NetworkHook } from './NetworkHook';

/**
 * @class ProjectInventoryEnhance
 * @description 业务数据清洗中间件。利用网络拦截基建，合并 PLM 微服务与仓储服务的数据集，实现实体状态的动态注入。
 */
export class ProjectInventoryEnhance {
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
            console.error('[Middleware] 数据清洗异常', error);
            return warehouseJson;
        }
    }

    public init(): void {
        NetworkHook.getInstance().registerResponseInterceptor({
            id: 'INTERCEPTOR_WAREHOUSE_STATS',
            urlMatcher: (url: string) => {
                try {
                    const requestUrl = new URL(url, window.location.origin);
                    const targetUrl = new URL(API_URLS.WAREHOUSE_DATA_STATS);
                    return requestUrl.pathname === targetUrl.pathname;
                } catch (error) {
                    return false; 
                }
            },
            beforeRequest: () => projectService.fetchProjectEntities(),
            handler: (originalJson: any, prefetchData: any) => {
                return this.injectTargetData(originalJson, prefetchData);
            }
        });
    }
}
