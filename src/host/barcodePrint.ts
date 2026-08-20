import { domMaster } from '../core/DomMaster';

/**
 * @const BarcodePrintHost
 * @description 条码打印页宿主页面契约：集中排产单输入区、项目下拉、查询按钮等宿主结构选择器。
 */
export const BarcodePrintHost = {
    /** 排产单号输入区（宿主 textarea 容器） */
    TEXTAREA_SELECTOR: '.el-textarea__inner',
    /** textarea 外层容器（控件组插入锚点） */
    TEXTAREA_WRAPPER_SELECTOR: '.el-textarea',
    /** 项目下拉选项内文本节点 */
    PROJECT_DROPDOWN_ITEM_SELECTOR: '.el-select-dropdown__item span',
    /** 页面查询按钮 */
    SEARCH_BUTTON_SELECTOR: '.filters button',
    /** 本模块注入控件组类名（幂等判定） */
    WRAPPER_CLASS: 'hhjg-barcode-wrapper',

    /**
     * @method getTextarea
     * @description 异步获取排产单输入区，超时抛错。
     * @returns {Promise<HTMLTextAreaElement>}
     */
    getTextarea(): Promise<HTMLTextAreaElement> {
        return domMaster.waitForElement<HTMLTextAreaElement>(BarcodePrintHost.TEXTAREA_SELECTOR);
    }
};
