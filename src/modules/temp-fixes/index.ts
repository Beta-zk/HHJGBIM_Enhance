import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';

/**
 * ⚠️ 临时修复样式（宿主页面自行修复后可无痛删除）：
 * 宿主 el-table 未设置固定高度，数据多时表体无限撑高，超出外层 .cs-z-page-main-content 的
 * overflow:hidden 裁剪，导致表格无法滚动、且可能将下方 .custom-pagination 挤出可视区。
 * 此处为表体容器设置视口自适应最大高度并开启内部滚动（表头保持固定），保证分页条始终可见。
 */
const TEMP_FIX_TABLE_SCROLL_STYLES = `
    .el-main.table-main .t-wrapper .el-table__body-wrapper {
        max-height: min(calc(100vh - 320px), 620px) !important;
        overflow: auto !important;
    }
`;

/**
 * @class TempFixesEnhance
 * @description 宿主缺陷临时修复插件。集中维护针对宿主页面 bug 的样式修补，
 * 与业务功能插件解耦：宿主修复后只需停用/移除本插件即可整体下线全部临时修补，
 * 无需逐个业务模块清理。本插件仅注入样式，不声明面板入口。
 */
class TempFixesEnhance implements IEnhanceModule {
    public readonly id = 'temp-fixes';
    public readonly title = '宿主临时修复';
    public readonly description = '集中维护宿主页面缺陷的临时修补样式，宿主修复后可整体下线本插件。';
    public readonly defaultEnabled = true;
    public readonly styleIds = ['temp-fix-barcode-table-scroll'];

    /**
     * @method init
     * @description 注入全部临时修复样式（样式 id 登记于 styleIds，注销时由内核统一移除）。
     * @param {ModuleContext} ctx 模块运行上下文
     */
    public init(ctx: ModuleContext): void {
        ctx.dom.injectStyle('temp-fix-barcode-table-scroll', TEMP_FIX_TABLE_SCROLL_STYLES);
    }
}

export const tempFixesEnhance = new TempFixesEnhance();
