import { API_URLS } from '../../config/constants';
import { RawInventoryHost } from '../../host/rawInventory';
import type { RawWhSummaryItem } from '../../types';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';

/**
 * @class ProjectMaterialInventoryEnhance
 * @description 原材料仓库存汇总增强模块。拦截汇总响应流，剔除 Weight 为 0 的无效节点并按权重降序重排，
 * 同时修正目标页容器宽度样式。数据改写走 transform 通道，样式修正走 onResponse 副作用通道。
 */
class ProjectMaterialInventoryEnhance implements IEnhanceModule {
    public readonly id = 'material-inventory';
    public readonly title = '原材料仓库汇总增强';
    public readonly description = '剔除无效重量节点并按权重重排原材料仓汇总数据。';
    public readonly defaultEnabled = true;
    public readonly settingsKey = 'enableProjectMaterialInventory';

    public readonly interceptors = [{
        id: 'INTERCEPTOR_RAW_MATERIAL_INVENTORY',
        urlMatcher: { pathname: API_URLS.GET_RAW_WH_SUMMARY_LIST },
        transform: (originalJson: any) => this.reorderAndFilterInventoryData(originalJson),
        onResponse: () => {
            this.injectStyleFix();
        }
    }];

    private ctx!: ModuleContext;

    /**
     * @method init
     * @description 记录模块上下文。拦截器由 EnhanceManager 按声明注册。
     * @param {ModuleContext} ctx 模块运行上下文
     */
    public init(ctx: ModuleContext): void {
        this.ctx = ctx;
        console.log('[Core] 原材料仓数据拦截管线与界面探针就绪');
    }

    /**
     * @private
     * @method injectStyleFix
     * @description 通过异步寻址将目标容器宽度显式修正为填充父容器（width/maxWidth 均置 100%），
     * 解除宿主固定宽度（如 1600px）在缩放时残留的右侧空白。
     */
    private injectStyleFix(): void {
        this.ctx.dom.waitForElement(RawInventoryHost.CONTAINER_SELECTOR)
            .then((targetContainer) => {
                if (targetContainer.style.width !== '100%' || targetContainer.style.maxWidth !== '100%') {
                    targetContainer.style.width = '100%';
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

            const filteredArray: RawWhSummaryItem[] = originalJson.Data.filter((item: any) => {
                const weightVal = item && item.Weight !== undefined ? parseFloat(item.Weight) : 0;
                return !isNaN(weightVal) && weightVal !== 0;
            });

            filteredArray.sort((prevItem: any, nextItem: any) => {
                const prevWeight = prevItem && prevItem.Weight !== undefined ? parseFloat(prevItem.Weight) : 0;
                const nextWeight = nextItem && nextItem.Weight !== undefined ? parseFloat(nextItem.Weight) : 0;
                return (isNaN(nextWeight) ? 0 : nextWeight) - (isNaN(prevWeight) ? 0 : prevWeight);
            });

            originalJson.Data = filteredArray;

            return originalJson;

        } catch (error) {
            console.error('[Middleware] 原材料仓汇总拦截洗牌引擎抛出灾难性异常，触发安全降级机制', error);
            return originalJson;
        }
    }
}

export const materialInventoryEnhance = new ProjectMaterialInventoryEnhance();
