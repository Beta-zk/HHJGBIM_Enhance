import { API_URLS } from '../config/constants';
import { NetworkHook } from './NetworkHook';
import { domMaster } from './DomMaster';

/**
 * @class ProjectMaterialInventoryEnhance
 * @description 原材料仓库存汇总增强中间件。拦截汇总响应流，剔除 Weight 为 0 的无效节点并按权重降序重排，
 * 同时修正目标页容器宽度样式。
 */
export class ProjectMaterialInventoryEnhance {

    /**
     * @method init
     * @description 向网络劫持总线注册原材料汇总响应流拦截器（路径精确匹配，异常时降级为关键字匹配）。
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
     * @description 通过异步寻址将目标容器宽度修正为 100%，消除布局边界约束。
     */
    private injectStyleFix(): void {
        domMaster.waitForElement('#app .app-wrapper .app-main .container.abs100')
            .then((targetContainer) => {
                if (targetContainer.style.maxWidth !== '100%') {
                    targetContainer.style.maxWidth = '100%';
                }
            })
            .catch((error) => {
                console.warn('[UI] 样式修复探针执行失败：', error.message);
            });
    }

    /**
     * @private
     * @method reorderAndFilterInventoryData
     * @description 清洗汇总报文：剔除 Weight 为 0 或解析异常的节点，其余节点按权重降序重排后回写。
     * @param {any} originalJson 原始响应报文
     * @returns {any} 清洗后的数据对象
     */
    private reorderAndFilterInventoryData(originalJson: any): any {
        try {
            if (!originalJson || !originalJson.Data || !Array.isArray(originalJson.Data) || originalJson.Data.length === 0) {
                return originalJson;
            }

            const filteredArray = originalJson.Data.filter((item: any) => {
                const weightVal = item && item.Weight !== undefined ? parseFloat(item.Weight) : 0;
                return !isNaN(weightVal) && weightVal !== 0;
            });

            filteredArray.sort((prevItem: any, nextItem: any) => {
                const prevWeight = prevItem && prevItem.Weight !== undefined ? parseFloat(prevItem.Weight) : 0;
                const nextWeight = nextItem && nextItem.Weight !== undefined ? parseFloat(nextItem.Weight) : 0;
                return (isNaN(nextWeight) ? 0 : nextWeight) - (isNaN(prevWeight) ? 0 : prevWeight);
            });

            originalJson.Data = filteredArray;

            console.log(`[Middleware] 原材料仓数据序列洗牌成功，剔除空节点后剩余 ${filteredArray.length} 项有效实体`);
            return originalJson;

        } catch (error) {
            console.error('[Middleware] 原材料仓汇总拦截洗牌引擎抛出灾难性异常，触发安全降级机制', error);
            return originalJson;
        }
    }
}
