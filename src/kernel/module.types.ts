import type { DomMaster } from '../core/DomMaster';
import type { IUserSettings } from '../config/settings';
import type { UrlPattern } from '../core/NetworkHook';
import type { Component } from 'vue';

/**
 * @interface IResponseInterceptorSpec
 * @description 模块声明式响应拦截器契约。提供 urlMatcher 路由匹配、可选的 beforeRequest 前置预取、
 * transform/onResponse 数据改写与副作用通道；指定 handler 时优先使用自定义处理器。
 */
export interface IResponseInterceptorSpec {
    id: string;
    urlMatcher: UrlPattern | ((url: string) => boolean);
    beforeRequest?: () => Promise<any>;
    transform?: (originalJson: any, prefetchData?: any) => any;
    onResponse?: (originalJson: any, prefetchData?: any) => void;
    handler?: (originalJson: any, prefetchData?: any) => any;
}

/**
 * @interface IPanelEntrySpec
 * @description 面板入口声明。声明即挂载：模块激活时由内核注册至全局 Shell 面板，
 * 注销时自动移除；未声明则不挂载。sort 为排序码，越小越靠前。
 */
export interface IPanelEntrySpec {
    /** 按钮显示文本 */
    label: string;
    /** 可选图标（emoji 文本） */
    icon?: string;
    /** 排序码，越小越靠前（默认 PANEL_SORT_DEFAULT = 1） */
    sort?: number;
    /** 点击行为，由模块自持闭包实现，Shell 不感知业务细节 */
    action: () => void;
    /** 可选动态文本（如"数据拉取中..."），返回当前显示文本 */
    text?: () => string;
    /** 可选禁用判定（如数据拉取期间禁用按钮） */
    disabled?: () => boolean;
}

export interface IEnhanceModule {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly defaultEnabled: boolean;
    readonly settingsKey?: string;
    readonly routes?: { match?: string[]; blacklist?: string[] };
    readonly interceptors?: IResponseInterceptorSpec[];
    readonly styleIds?: string[];
    /** 模块挂载的私有视图组件：激活时由内核挂载至全局 App，注销时自动卸载 */
    readonly component?: Component;
    /** 面板入口声明：声明即挂载至全局 Shell 面板，未声明则不显示 */
    readonly panelEntry?: IPanelEntrySpec;

    init(ctx: ModuleContext): void | Promise<void>;
    destroy?(): void;
}

export interface ModuleContext {
    readonly dom: DomMaster;
    readonly settings: () => IUserSettings;
}
