import { domMaster } from '../core/DomMaster';

/**
 * @const BarcodePrintHost
 * @description 条码打印页宿主页面契约：集中排产单输入区、filter-left 容器、项目下拉、查询按钮等宿主结构选择器。
 * 选择器随宿主页面版本更新而调整，变更时需以最新下载的页面源码核对。
 */
export const BarcodePrintHost = {
    /** 排产单号输入区（宿主 textarea，原查询逻辑的输入源） */
    TEXTAREA_SELECTOR: '.el-textarea__inner',
    /** textarea 外层容器 */
    TEXTAREA_WRAPPER_SELECTOR: '.el-textarea',
    /** filter-left 筛选容器（控件组挂载锚点） */
    FILTER_LEFT_SELECTOR: '.filter-left',
    /** filter-left 内宿主原有表单项（label + textarea，隐藏但保留 DOM） */
    FILTER_LEFT_FORM_ITEM_SELECTOR: '.filter-left > .el-form-item',
    /** 项目下拉选项内文本节点 */
    PROJECT_DROPDOWN_ITEM_SELECTOR: '.el-select-dropdown__item span',
    /** 页面查询按钮（宿主 el-button 风格，文本精确为「查询」） */
    SEARCH_BUTTON_SELECTOR: '.el-button--primary',
    /** 宿主查询按钮的精确文本（区分本模块注入的「查询所属构件」按钮） */
    SEARCH_BUTTON_TEXT: '查询',
    /** 本模块注入控件组类名（幂等判定） */
    WRAPPER_CLASS: 'hhjg-barcode-wrapper',
    /** 构件清单悬浮面板根类名 */
    PANEL_CLASS: 'hhjg-barcode-panel',
    /** 悬浮面板头部类名（可拖拽区） */
    PANEL_HEADER_CLASS: 'hhjg-barcode-panel-header',
    /** 悬浮面板列表区类名（可滚动） */
    PANEL_BODY_CLASS: 'hhjg-barcode-panel-body',

    /**
     * @method getTextarea
     * @description 异步获取排产单输入区（宿主 textarea），超时抛错。
     * @returns {Promise<HTMLTextAreaElement>}
     */
    getTextarea(): Promise<HTMLTextAreaElement> {
        return domMaster.waitForElement<HTMLTextAreaElement>(BarcodePrintHost.TEXTAREA_SELECTOR);
    },

    /**
     * @method getFilterLeft
     * @description 异步获取 filter-left 筛选容器，超时抛错。
     * @returns {Promise<HTMLElement>}
     */
    getFilterLeft(): Promise<HTMLElement> {
        return domMaster.waitForElement<HTMLElement>(BarcodePrintHost.FILTER_LEFT_SELECTOR);
    }
};
