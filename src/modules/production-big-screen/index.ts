import { BigScreenHost } from '../../host/bigScreen';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';

/**
 * @class ProductionIntegrationBigScreenEnhance
 * @description 生产看板交互增强模块。通过监听特定数据接口触发 DOM 轮询机制，实施无侵入式的
 * 元素劫持与点击穿透路由绑定。DOM 等待与菜单点击模拟经 ModuleContext.dom 委托 DomMaster。
 */
class ProductionIntegrationBigScreenEnhance implements IEnhanceModule {
    public readonly id = 'production-big-screen';
    public readonly title = '生产集成大屏增强';
    public readonly description = '允许点击指标直接无缝跳转至对应的系统二级页面。';
    public readonly defaultEnabled = true;
    public readonly settingsKey = 'enableProductionBigScreen';

    public readonly interceptors = [{
        id: 'INTERCEPTOR_BIG_SCREEN_CONFIG',
        urlMatcher: '/pro/BigScreenConfig/GetBigScreenConfigList',
        onResponse: () => {
            this.injectDomInteraction();
        }
    }];

    private ctx!: ModuleContext;

    /**
     * @method init
     * @description 记录模块上下文。拦截器由 EnhanceManager 按声明注册。
     * @param {ModuleContext} ctx 模块运行上下文
     */
    public init(ctx: ModuleContext): void {
        this.ctx = ctx;
    }

    /**
     * @method injectDomInteraction
     * @description 轮询等待看板两个指标卡片就位，为第三项数值绑定点击事件以跳转对应报表菜单（幂等，由标记属性防重）。
     */
    private injectDomInteraction(): void {
        this.ctx.dom.waitForCondition(() => {
            const rightBoxes = this.ctx.dom.querySelectorAll<HTMLElement>(BigScreenHost.RIGHT_BOX_SELECTOR);
            if (rightBoxes.length < 2) return false;

            let successfulInjections = 0;
            const targetConfigs = [
                { container: rightBoxes[0], menuTargetText: '工厂产量看板', flag: 'data-enhanced-annual' },
                { container: rightBoxes[1], menuTargetText: '班组产量报表', flag: 'data-enhanced-monthly' }
            ];

            targetConfigs.forEach(config => {
                const numBoxes = config.container.querySelectorAll(BigScreenHost.NUM_BOX_SELECTOR);
                if (numBoxes.length >= 3) {
                    const targetSpan = numBoxes[2].querySelector(BigScreenHost.NUM_VALUE_SELECTOR) as HTMLElement;
                    if (targetSpan) {
                        if (!targetSpan.hasAttribute(config.flag)) {
                            targetSpan.setAttribute(config.flag, 'true');
                            targetSpan.style.cursor = 'pointer';
                            
                            targetSpan.addEventListener('click', (e: MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this.triggerSidebarMenuClick(config.menuTargetText);
                            });
                        }
                        successfulInjections++;
                    }
                }
            });

            return successfulInjections === targetConfigs.length ? true : false;
        }).then(() => {
            console.log('[UI] 看板交互挂载完毕');
        }).catch(() => {
            console.warn('[UI] 目标 DOM 解析超时');
        });
    }

    /**
     * @method triggerSidebarMenuClick
     * @description 点击侧边栏中文本匹配的目标菜单项，未命中时输出错误日志。
     * @param {string} targetText 菜单文本关键字
     */
    private triggerSidebarMenuClick(targetText: string): void {
        if (!this.ctx.dom.clickElementByText(BigScreenHost.SIDEBAR_MENU_SELECTOR, targetText)) {
            console.error(`[UI] 导航节点索引失败: ${targetText}`);
        }
    }
}

export const bigScreenEnhance = new ProductionIntegrationBigScreenEnhance();
