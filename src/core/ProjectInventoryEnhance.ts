import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { systemService } from '../services/SystemService';
import { BimProjectItem, PlmEntityItem } from '../types';
import { NetworkHook } from './NetworkHook';

/**
 * @class ProjectInventoryEnhance
 * @description 业务数据重组中间件。结合网络挂钩的前置依赖处理特性，基于预热探活标识决定分支走向。
 */
export class ProjectInventoryEnhance {
    private isCrawlerReady: boolean = false;

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
            console.error('[Middleware] 实体映射发生异常', error);
            return warehouseJson;
        }
    }

    /**
     * @method init
     * @description 初始化清洗管线。发起非阻塞探活，消除拦截器的等待时延。
     */
    public init(): void {
        // 异步预热健康状态，不挂起主线程
        systemService.ping().then(res => {
            this.isCrawlerReady = !!res;
        }).catch(() => {
            this.isCrawlerReady = false;
        });

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
            // 利用缓存的就绪态，以 0ms 损耗进行降级路由分发
            beforeRequest: () => projectService.fetchProjectEntities(this.isCrawlerReady),
            handler: (originalJson: any, prefetchData: any) => {
                return this.injectTargetData(originalJson, prefetchData);
            }
        });
    }
}
