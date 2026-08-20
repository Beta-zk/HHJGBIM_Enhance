import { domMaster } from '../core/DomMaster';

/**
 * @const ProjectListHost
 * @description 项目列表/库存页的宿主页面契约：集中页面锚点与行选择器等易变选择器，
 * 宿主改版时仅需在此处维护。语义查询函数委托 DomMaster 通用能力实现。
 */
export const ProjectListHost = {
    /** 状态筛选面板定位锚点（页面内容区） */
    FILTER_PANEL_ANCHOR: '.cs-z-page-main-content',
    /** 表格数据行选择器（vxe 渲染的 tbody 行） */
    ROW_SELECTOR: 'table tbody tr',

    /**
     * @method getFilterPanelAnchor
     * @description 异步获取筛选面板挂载锚点，超时抛错。
     * @returns {Promise<HTMLElement>}
     */
    getFilterPanelAnchor(): Promise<HTMLElement> {
        return domMaster.waitForElement<HTMLElement>(ProjectListHost.FILTER_PANEL_ANCHOR);
    }
};
