import { API_URLS } from '../config/constants';
import { NetworkHook } from './NetworkHook';

/**
 * @class ProjectMaterialInventoryEnhance
 * @description 原材料仓库存汇总数据重组增强中间件。拦截专属响应流，对内部对象数组依 Weight 字段执行从大到小的有序重洗。
 */
export class ProjectMaterialInventoryEnhance {

    /**
     * @method init
     * @description 初始化拦截管线，向全局网络劫持基建注册原材料汇总响应流的篡改规则。
     */
    public init(): void {
        NetworkHook.getInstance().registerResponseInterceptor({
            id: 'INTERCEPTOR_RAW_MATERIAL_INVENTORY',
            urlMatcher: (url: string) => {
                try {
                    const requestUrl = new URL(url, window.location.origin);
                    const targetUrl = new URL(API_URLS.GET_RAW_WH_SUMMARY_LIST);
                    return requestUrl.pathname === targetUrl.pathname;
                } catch (error) {
                    return url.includes('/PRO/MaterielInventory/GetRawWHSummaryList');
                }
            },
            handler: (originalJson: any) => {
                return this.reorderInventoryData(originalJson);
            }
        });
        console.log('[Core] 原材料仓数据拦截管线就绪');
    }

    /**
     * @private
     * @method reorderInventoryData
     * @description 重新排列原始报文中的对象序列。提取关键数值型或字符串型的 Weight 权重进行逆序排列。
     * @param {any} originalJson 原始 JSON 响应报文
     * @returns {any} 重排处理后的 JSON 数据对象
     */
    private reorderInventoryData(originalJson: any): any {
        try {
            if (!originalJson) {
                return originalJson;
            }

            // 依据后端常见的数据报文拓扑，兼容处理直属数组、包裹在 Data 域或包裹在 Data.Data 内的数组流
            let targetArray: any[] | null = null;
            let arrayLocation: 'root' | 'data' | 'dataData' | null = null;

            if (Array.isArray(originalJson)) {
                targetArray = originalJson;
                arrayLocation = 'root';
            } else if (originalJson.Data && Array.isArray(originalJson.Data)) {
                targetArray = originalJson.Data;
                arrayLocation = 'data';
            } else if (originalJson.Data && originalJson.Data.Data && Array.isArray(originalJson.Data.Data)) {
                targetArray = originalJson.Data.Data;
                arrayLocation = 'dataData';
            }

            // 边界熔断防御：未捕获到合规的数据项数组则直接放行原报文，防止系统崩溃
            if (!targetArray || targetArray.length === 0) {
                return originalJson;
            }

            // 对目标数组执行原地逆序重洗（依据 Weight 从大到小排序）
            targetArray.sort((prevItem: any, nextItem: any) => {
                const prevWeight = prevItem && prevItem.Weight !== undefined ? parseFloat(prevItem.Weight) : 0;
                const nextWeight = nextItem && nextItem.Weight !== undefined ? parseFloat(nextItem.Weight) : 0;
                
                // 排除无效数值或 NaN 导致的排序失效
                const validPrev = isNaN(prevWeight) ? 0 : prevWeight;
                const validNext = isNaN(nextWeight) ? 0 : nextWeight;

                return validNext - validPrev;
            });

            console.log(`[Middleware] 原材料仓数据序列洗牌成功，已重组 ${targetArray.length} 项实体的排布顺序`);
            return originalJson;

        } catch (error) {
            console.error('[Middleware] 原材料仓汇总拦截洗牌引擎抛出灾难性异常，触发安全降级机制', error);
            return originalJson;
        }
    }
}
