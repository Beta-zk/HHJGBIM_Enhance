import { shallowReactive } from 'vue';

/**
 * @interface PanelEntry
 * @description 全局面板入口元数据。模块激活时由内核注册，Shell 面板只读渲染。
 */
export interface PanelEntry {
    /** 模块 id，作为注册表唯一键 */
    id: string;
    /** 按钮显示文本 */
    label: string;
    /** 可选图标（emoji 文本） */
    icon?: string;
    /** 排序码，越小越靠前（默认 PANEL_SORT_DEFAULT） */
    sort: number;
    /** 点击行为，由模块自持闭包实现，Shell 不感知业务细节 */
    action: () => void;
    /** 可选动态文本（如"数据拉取中..."），返回当前显示文本 */
    text?: () => string;
    /** 可选禁用判定（如数据拉取期间禁用按钮） */
    disabled?: () => boolean;
}

/**
 * @const panelStore
 * @description 面板入口注册表。作为模块与 Shell 面板之间的反向注入中介：
 * 模块激活时 register、注销时 unregister，Shell 通过 sorted 只读渲染，
 * 实现"即插即用，零耦合"。
 */
export const panelStore = {
    entries: shallowReactive(new Map<string, PanelEntry>()),

    /**
     * @method register
     * @description 注册面板入口（模块 activate 时调用）。
     * @param {PanelEntry} entry 入口元数据
     */
    register(entry: PanelEntry) {
        this.entries.set(entry.id, entry);
    },

    /**
     * @method unregister
     * @description 移除面板入口（模块 deactivate 时调用）。
     * @param {string} id 模块 id
     */
    unregister(id: string) {
        this.entries.delete(id);
    },

    /**
     * @getter sorted
     * @description 按排序码稳定排序后的入口列表（同序按注册先后）。
     * @returns {PanelEntry[]}
     */
    get sorted(): PanelEntry[] {
        return Array.from(this.entries.values()).sort((a, b) => a.sort - b.sort);
    }
};
