import { domMaster } from '../core/DomMaster';
import { NetworkHook, matchUrl, type IResponseInterceptor } from '../core/NetworkHook';
import { settings } from '../config/settings';
import type { IEnhanceModule, IResponseInterceptorSpec, ModuleContext } from './module.types';

/**
 * @class EnhanceManager
 * @description 增强模块内核。统一承担模块的注册、按配置装载、路由裁决、生命周期管理（init/destroy）、
 * 拦截器托管（激活注册 / 销毁注销）与错误隔离（单模块故障不影响其他模块与宿主页面）。
 * main 入口仅需 registerAll + start 两条调用。
 */
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
     * @description 注册单个增强模块，返回自身以支持链式调用。
     * @param {IEnhanceModule} module 模块实例
     * @returns {EnhanceManager}
     */
    public register(module: IEnhanceModule): this {
        this.modules.push(module);
        return this;
    }

    /**
     * @method registerAll
     * @description 批量注册增强模块。
     * @param {IEnhanceModule[]} moduleList 模块清单
     * @returns {EnhanceManager}
     */
    public registerAll(moduleList: IEnhanceModule[]): this {
        this.modules.push(...moduleList);
        return this;
    }

    /**
     * @method start
     * @description 启动内核：按用户配置装载启用的模块，并挂载路由变化监听用于路由裁决。仅允许执行一次。
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
     * @description 卸载全部已激活模块并移除路由监听（脚本终止场景）。
     */
    public dispose(): void {
        this.modules.forEach(module => this.deactivate(module));
        this.unregisterRouteListener?.();
        this.unregisterRouteListener = null;
        this.started = false;
    }

    /**
     * @method isEnabled
     * @description 依据用户配置判定模块是否启用（配置缺失时回退 defaultEnabled）。
     * @param {IEnhanceModule} module 模块实例
     * @returns {boolean}
     */
    public isEnabled(module: IEnhanceModule): boolean {
        const key = module.settingsKey || module.id;
        const config = this.ctx.settings() as any;
        const value = config[key];
        return value === undefined ? module.defaultEnabled : !!value;
    }

    // ==================== 内部实现 ====================

    /**
     * @method activate
     * @description 激活模块：注册声明式拦截器与样式，调用 init（错误隔离）。幂等。
     * @param {IEnhanceModule} module 模块实例
     */
    private activate(module: IEnhanceModule): void {
        if (this.activeModules.has(module.id)) return;

        module.interceptors?.forEach(spec => {
            NetworkHook.getInstance().registerResponseInterceptor(this.normalizeSpec(spec));
        });

        try {
            module.init(this.ctx);
            this.activeModules.add(module.id);
        } catch (error) {
            console.error(`[Kernel] 模块激活失败，已隔离: ${module.id}`, error);
        }
    }

    /**
     * @method deactivate
     * @description 销毁模块：调用 destroy（错误隔离）、注销声明式拦截器、清理注入样式。幂等。
     * @param {IEnhanceModule} module 模块实例
     */
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

        this.activeModules.delete(module.id);
    }

    /**
     * @method evaluateRoutes
     * @description 路由裁决：对声明了路由约束的模块，按当前 URL 激活/停用；
     * 未声明约束的模块保持全局激活，由模块自身管理内部页面差异。
     */
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

    /**
     * @method normalizeSpec
     * @description 将模块声明式拦截器规格规范化为 NetworkHook 的 IResponseInterceptor：
     * 优先取 handler（旧签名）；否则组合 transform（改数据）+ onResponse（副作用，传原始响应）。
     * @param {IResponseInterceptorSpec} spec 模块声明规格
     * @returns {IResponseInterceptor}
     */
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
