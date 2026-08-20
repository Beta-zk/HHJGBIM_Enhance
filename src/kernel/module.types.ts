import type { DomMaster } from '../core/DomMaster';
import type { IUserSettings } from '../config/settings';
import type { UrlPattern } from '../core/NetworkHook';

/**
 * @interface IResponseInterceptorSpec
 * @description 模块声明式响应拦截器规格。二选一：
 * - transform：纯数据改写（响应体篡改，返回新数据）；
 * - onResponse：副作用触发（响应到达时执行 UI 注入等，不返回数据）。
 * 两者可同时提供；提供 handler 时按旧签名整体接管（兼容既有实现）。
 */
export interface IResponseInterceptorSpec {
    /** 拦截器唯一标识（NetworkHook 注册/注销共用） */
    id: string;
    /** URL 匹配：复用 NetworkHook.matchUrl 的 UrlPattern 或自定义判定 */
    urlMatcher: UrlPattern | ((url: string) => boolean);
    /** 请求前预取数据（可选） */
    beforeRequest?: () => Promise<any>;
    /** 数据改写：接收原始响应，返回改写后的响应体 */
    transform?: (originalJson: any, prefetchData?: any) => any;
    /** 副作用触发：响应到达时的钩子，返回值被忽略 */
    onResponse?: (originalJson: any, prefetchData?: any) => void;
    /** 旧签名整体接管（与 transform/onResponse 互斥，优先） */
    handler?: (originalJson: any, prefetchData?: any) => any;
}

/**
 * @interface IEnhanceModule
 * @description 增强模块契约。模块声明自身元信息（开关/标题/路由约束/拦截器/样式），
 * 由 EnhanceManager 统一装载、路由裁决、生命周期回收与错误隔离。
 * 新增增强 = 实现本接口并 register 一条，其余装配全部自动化。
 */
export interface IEnhanceModule {
    /** 模块唯一标识（默认作为配置开关键） */
    readonly id: string;
    /** 设置面板展示名 */
    readonly title: string;
    /** 设置面板描述（可选） */
    readonly description?: string;
    /** 默认启用状态（用户配置缺失时兜底） */
    readonly defaultEnabled: boolean;
    /** 自定义配置开关键（缺省取 id，如 enableProjectState） */
    readonly settingsKey?: string;
    /** 可选路由约束：match 命中且不在 blacklist 时激活，否则 destroy */
    readonly routes?: { match?: string[]; blacklist?: string[] };
    /** 声明式拦截器：manager 激活时统一注册，销毁时自动注销 */
    readonly interceptors?: IResponseInterceptorSpec[];
    /** 模块注入的样式标签 id 清单：销毁时自动移除 */
    readonly styleIds?: string[];
    /** 模块激活入口（manager 调用，含错误隔离） */
    init(ctx: ModuleContext): void | Promise<void>;
    /** 模块销毁入口（路由离开/禁用时调用，负责 DOM 与监听回收） */
    destroy?(): void;
}

/**
 * @interface ModuleContext
 * @description 模块运行上下文。由 EnhanceManager 注入，模块通过 ctx 访问宿主基础能力，
 * 不直接依赖全局单例，便于替换与测试。
 */
export interface ModuleContext {
    /** 宿主 DOM 基建单例 */
    readonly dom: DomMaster;
    /** 用户配置读取器（每次调用返回最新副本） */
    readonly settings: () => IUserSettings;
}
