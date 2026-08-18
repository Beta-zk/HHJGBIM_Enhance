import { API_URLS } from '../config/constants';
import { NetworkHook } from './NetworkHook';

/**
 * @class ProjectMaterialInventoryEnhance
 * @description 原材料仓库存汇总数据重组增强中间件。拦截专属响应流，剔除权重(Weight)为0的无效节点，并对有效对象数组执行从大到小的有序重洗。
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
                return this.reorderAndFilterInventoryData(originalJson);
            }
        });
        console.log('[Core] 原材料仓数据拦截管线就绪');
    }

    /**
     * @private
     * @method reorderAndFilterInventoryData
     * @description 重新排列并清洗原始报文中的对象序列。剔除 Weight 字段为 0 的节点，并将剩余有效节点逆序排列后回写。
     * @param {any} originalJson 原始 JSON 响应报文
     * @returns {any} 洗牌与过滤后的 JSON 数据对象
     */
    private reorderAndFilterInventoryData(originalJson: any): any {
        try {
            if (!originalJson) {
                return originalJson;
            }

            let targetArray: any[] | null = null;
            let arrayLocation: 'root' | 'data' | 'dataData' | null = null;

            // 依据后端常见的数据报文拓扑，动态寻址实体数组
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

            // 边界熔断防御：未捕获到合规的数据项数组则直接放行原报文
            if (!targetArray || targetArray.length === 0) {
                return originalJson;
            }

            // 阶段一：前置清洗，剔除 Weight 为 0 或解析异常的无效节点
            const filteredArray = targetArray.filter((item: any) => {
                const weightVal = item && item.Weight !== undefined ? parseFloat(item.Weight) : 0;
                // 保留有效数值，且严格剔除 0
                return !isNaN(weightVal) && weightVal !== 0;
            });

            // 阶段二：对清洗后的高价值数据执行原地逆序重洗（依据 Weight 从大到小排序）
            filteredArray.sort((prevItem: any, nextItem: any) => {
                const prevWeight = prevItem && prevItem.Weight !== undefined ? parseFloat(prevItem.Weight) : 0;
                const nextWeight = nextItem && nextItem.Weight !== undefined ? parseFloat(nextItem.Weight) : 0;
                
                const validPrev = isNaN(prevWeight) ? 0 : prevWeight;
                const validNext = isNaN(nextWeight) ? 0 : nextWeight;

                return validNext - validPrev;
            });

            // 阶段三：依据路由层级记录，将过滤排序后的独立安全副本接管回传至原 JSON 拓扑路径
            if (arrayLocation === 'root') {
                originalJson = filteredArray;
            } else if (arrayLocation === 'data') {
                originalJson.Data = filteredArray;
            } else if (arrayLocation === 'dataData') {
                originalJson.Data.Data = filteredArray;
            }

            console.log(`[Middleware] 原材料仓数据序列洗牌成功，剔除空节点后剩余 ${filteredArray.length} 项有效实体`);
            return originalJson;

        } catch (error) {
            console.error('[Middleware] 原材料仓汇总拦截洗牌引擎抛出灾难性异常，触发安全降级机制', error);
            return originalJson;
        }
    }
}
