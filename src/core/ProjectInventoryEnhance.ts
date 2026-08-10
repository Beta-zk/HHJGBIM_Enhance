import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { BimProjectItem, PlmEntityItem } from '../types';
import { NetworkManager } from './NetworkManager';

/**
 * @class ProjectInventoryEnhance
 * @description 项目库存数据增强模块。基于拆分后的响应总线实现脏数据兜底清洗。
 */
export class ProjectInventoryEnhance {
    
    /**
     * @method injectTargetData
     * @description 执行数据注入解析（现为纯同步函数）。
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

            let modifiedCount = 0;
            warehouseItems.forEach(item => {
                if (item?.Project_Name) {
                    if (stateMap.has(item.Project_Name)) {
                        item.State_Name = stateMap.get(item.Project_Name)!;
                        modifiedCount++;
                    } else {
                        if (!item.State_Name || String(item.State_Name) === '0') {
                            item.State_Name = '未知';
                        }
                    }
                }
            });
            
            console.log(`[HHJGBIM_Enhance] 拦截成功，静态寻址注入 ${modifiedCount} 条状态`);
            return warehouseJson;
        } catch (error) {
            console.error('[HHJGBIM_Enhance] 数据解析注入异常:', error);
            return warehouseJson;
        }
    }

    /**
     * @method init
     * @description 注册拆分后的双阶篡改拦截器。
     */
    public init(): void {
        NetworkManager.getInstance().registerResponseInterceptor({
            urlMatcher: (url: string) => url.includes(API_URLS.WAREHOUSE_DATA_STATS),
            // 阶段一：前置挂起，拉取跨域 PLM 依赖数据
            beforeRequest: () => projectService.fetchProjectEntities(),
            // 阶段二：响应就绪，纯内存同步注入，杜绝前端 Vue 视图漏绑
            handler: (originalJson: any, prefetchData: any) => {
                return this.injectTargetData(originalJson, prefetchData);
            }
        });
        console.log('[HHJGBIM_Enhance] 仓储数据清洗业务已注册至总线 (双阶同步版)');
    }
}
