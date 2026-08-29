import { PANEL_SORT_SETTINGS } from '../../config/constants';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';
import { settingsStore } from './store';
import SettingsPanel from './view/SettingsPanel.vue';

/**
 * @class SettingsEnhance
 * @description 偏好设置增强模块。维护系统级偏好数据（模块启停开关、爬虫服务地址、深化人员名单），
 * 通过 panelEntry 声明挂载至全局 Shell 面板（排序码置底 PANEL_SORT_SETTINGS），
 * 点击入口由 settingsStore 控制弹窗显隐，形成"入口注册 + 私有 store 驱动视图"的完整闭环。
 */
class SettingsEnhance implements IEnhanceModule {
    public readonly id = 'settings';
    public readonly title = '偏好设置';
    public readonly description = '偏好设置中心：模块启停开关、爬虫服务地址与深化人员名单配置。';
    public readonly defaultEnabled = true;
    public readonly component = SettingsPanel;

    public readonly panelEntry = {
        label: '偏好设置',
        icon: '⚙️',
        sort: PANEL_SORT_SETTINGS,
        action: () => settingsStore.open()
    };

    public init(_ctx: ModuleContext): void {
        // 设置模块无宿主 DOM 增强，仅提供面板入口与视图组件
    }
}

export const settingsEnhance = new SettingsEnhance();
