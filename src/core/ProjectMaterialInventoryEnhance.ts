import { API_URLS } from '../config/constants';
import { NetworkHook } from './NetworkHook';
import { waitForElement } from '../utils/helpers';

/**
 * @class ProjectMaterialInventoryEnhance
 * @description 原材料仓库存汇总数据重组增强中间件。拦截专属响应流，剔除权重(Weight)为0的无效节点，并对有效对象数组执行从大到小的有序重洗。
 * 同步引入针对特定页面的 CSS 容器宽度样式修正机制。
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
                this.injectStyleFix();
                return this.reorderAndFilterInventoryData(originalJson);
            }
        });
        console.log('[Core] 原材料仓数据拦截管线与界面探针就绪');
    }

    /**
     * @private
     * @method injectStyleFix
     * @description 样式修复探针。基于通用工具层提供的异步轮询机制，动态注入最大宽度限制约束。
     */
    private injectStyleFix(): void {
        waitForElement('#app .app-wrapper .app-main .container.abs100')
            .then((targetContainer) => {
                if (targetContainer.style.maxWidth !== '100%') {
                    targetContainer.style.maxWidth = '100%';
                    console.log('[UI] 样式边界约束修正执行完毕：成功赋予目标容器 max-width: 100%');
                }
            })
            .catch((error) => {
                console.warn('[UI] 样式修复探针执行失败：', error.message);
            });
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
            // 依据明确拓扑结构实施严格断言，阻断不合规报文
            if (!originalJson || !originalJson.Data || !Array.isArray(originalJson.Data)) {
                return originalJson;
            }

            const targetArray = originalJson.Data;

            // 边界熔断防御：数据项为空直接放行
            if (targetArray.length === 0) {
                return originalJson;
            }

            // 阶段一：前置清洗，剔除 Weight 为 0 或解析异常的无效节点
            const filteredArray = targetArray.filter((item: any) => {
                const weightVal = item && item.Weight !== undefined ? parseFloat(item.Weight) : 0;
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

            // 阶段三：回写至原定层级
            originalJson.Data = filteredArray;

            console.log(`[Middleware] 原材料仓数据序列洗牌成功，剔除空节点后剩余 ${filteredArray.length} 项有效实体`);
            return originalJson;

        } catch (error) {
            console.error('[Middleware] 原材料仓汇总拦截洗牌引擎抛出灾难性异常，触发安全降级机制', error);
            return originalJson;
        }
    }
}
