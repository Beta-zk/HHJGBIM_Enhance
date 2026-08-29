import { domMaster } from '../core/DomMaster';
import { NetworkHook, matchUrl, type IResponseInterceptor } from '../core/NetworkHook';
import { settings } from '../config/settings';
import { PANEL_SORT_DEFAULT } from '../config/constants';
import { uiStore } from './ui/uiStore';
import { panelStore } from './ui/panelStore';
import type { IEnhanceModule, IResponseInterceptorSpec, ModuleContext } from './module.types';

export class EnhanceManager {
    private modules: IEnhanceModule[] = [];
    private activeModules = new Set<string>();
    private unregisterRouteListener: (() => void) | null = null;
    private started = false;

    private readonly ctx: ModuleContext = {
        dom: domMaster,
        settings: () => settings.get()
    };

    /**
     * @method register
     * @description 注册单个增强模块，供后续 start() 统一装载。
     * @param {IEnhanceModule} module 增强模块实例
     * @returns {this} 支持链式调用
     */
    public register(module: IEnhanceModule): this {
        this.modules.push(module);
        return this;
    }

    /**
     * @method registerAll
     * @description 批量注册增强模块。
     * @param {IEnhanceModule[]} moduleList 增强模块数组
     * @returns {this} 支持链式调用
     */
    public registerAll(moduleList: IEnhanceModule[]): this {
        this.modules.push(...moduleList);
        return this;
    }

    /**
     * @method start
     * @description 启动增强内核：按启用配置激活模块，并挂载路由监听驱动按页启用/停用。幂等，仅执行一次。
     */
    public start(): void {
        if (this.started) return;
        this.started = true;

        this.modules.forEach(module => {
            if (this.isEnabled(module)) {
                this.activate(module);
            }
        });

        this.unregisterRouteListener = domMaster.onRouteChange(() => this.evaluateRoutes());
        console.log(`[Kernel] 增强内核已启动，启用模块 ${this.activeModules.size}/${this.modules.length}`);
    }

    /**
     * @method dispose
     * @description 停用全部模块并卸载路由监听，将内核复位至未启动状态（测试或热重载用）。
     */
    public dispose(): void {
        this.modules.forEach(module => this.deactivate(module));
        this.unregisterRouteListener?.();
        this.unregisterRouteListener = null;
        this.started = false;
    }

    /**
     * @method isEnabled
     * @description 依据用户配置判定模块是否启用：读取 settingsKey（缺省回退模块 id）对应开关，
     * 未配置时使用模块默认值。
     * @param {IEnhanceModule} module 增强模块实例
     * @returns {boolean} 是否启用
     */
    public isEnabled(module: IEnhanceModule): boolean {
        const key = module.settingsKey || module.id;
        const config = this.ctx.settings() as any;
        const value = config[key];
        return value === undefined ? module.defaultEnabled : !!value;
    }

    private activate(module: IEnhanceModule): void {
        if (this.activeModules.has(module.id)) return;

        module.interceptors?.forEach(spec => {
            NetworkHook.getInstance().registerResponseInterceptor(this.normalizeSpec(spec));
        });

        if (module.component) {
            uiStore.register(module.id, module.component);
        }

        if (module.panelEntry) {
            panelStore.register({
                id: module.id,
                label: module.panelEntry.label,
                icon: module.panelEntry.icon,
                sort: module.panelEntry.sort ?? PANEL_SORT_DEFAULT,
                action: module.panelEntry.action,
                text: module.panelEntry.text,
                disabled: module.panelEntry.disabled
            });
        }

        try {
            module.init(this.ctx);
            this.activeModules.add(module.id);
        } catch (error) {
            console.error(`[Kernel] 模块激活失败，已隔离: ${module.id}`, error);
        }
    }

    private deactivate(module: IEnhanceModule): void {
        if (!this.activeModules.has(module.id)) return;

        try {
            module.destroy?.();
        } catch (error) {
            console.error(`[Kernel] 模块销毁异常: ${module.id}`, error);
        }

        module.interceptors?.forEach(spec => {
            NetworkHook.getInstance().unregisterResponseInterceptor(spec.id);
        });

        module.styleIds?.forEach(styleId => {
            domMaster.removeStyle(styleId);
        });

        if (module.component) {
            uiStore.unregister(module.id);
        }

        panelStore.unregister(module.id);

        this.activeModules.delete(module.id);
    }

    private evaluateRoutes(): void {
        const currentUrl = window.location.href;

        this.modules.forEach(module => {
            if (!this.isEnabled(module) || !module.routes) return;

            const { match = [], blacklist = [] } = module.routes;
            const shouldActive = matchUrl(currentUrl, match) && !matchUrl(currentUrl, blacklist);

            if (shouldActive && !this.activeModules.has(module.id)) {
                this.activate(module);
            } else if (!shouldActive && this.activeModules.has(module.id)) {
                this.deactivate(module);
            }
        });
    }

    private normalizeSpec(spec: IResponseInterceptorSpec): IResponseInterceptor {
        const urlMatcher = typeof spec.urlMatcher === 'function'
            ? spec.urlMatcher
            : (url: string) => matchUrl(url, spec.urlMatcher as any);

        let handler: IResponseInterceptor['handler'];
        if (spec.handler) {
            handler = spec.handler;
        } else {
            handler = (originalJson: any, prefetchData?: any) => {
                const result = spec.transform ? spec.transform(originalJson, prefetchData) : originalJson;
                spec.onResponse?.(originalJson, prefetchData);
                return result;
            };
        }

        return {
            id: spec.id,
            urlMatcher,
            beforeRequest: spec.beforeRequest,
            handler
        };
    }
}

export const enhanceManager = new EnhanceManager();
