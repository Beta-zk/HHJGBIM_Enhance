import type { DomMaster } from '../core/DomMaster';
import type { IUserSettings } from '../config/settings';
import type { UrlPattern } from '../core/NetworkHook';
import type { Component } from 'vue';

export interface IResponseInterceptorSpec {
    id: string;
    urlMatcher: UrlPattern | ((url: string) => boolean);
    beforeRequest?: () => Promise<any>;
    transform?: (originalJson: any, prefetchData?: any) => any;
    onResponse?: (originalJson: any, prefetchData?: any) => void;
    handler?: (originalJson: any, prefetchData?: any) => any;
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
    
    init(ctx: ModuleContext): void | Promise<void>;
    destroy?(): void;
}

export interface ModuleContext {
    readonly dom: DomMaster;
    readonly settings: () => IUserSettings;
}
