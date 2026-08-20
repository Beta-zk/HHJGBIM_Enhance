import { NetworkHook } from './NetworkHook';
import { domMaster } from './DomMaster';

/**
 * @class ProductionIntegrationBigScreenEnhance
 * @description 生产看板交互增强引擎。通过监听特定数据接口触发 DOM 轮询机制，实施无侵入式的元素劫持与点击穿透路由绑定。
 * DOM 等待与菜单点击模拟委托给 DomMaster。
 */
export class ProductionIntegrationBigScreenEnhance {
    
    /**
     * @method init
     * @description 向网络劫持总线注册大屏配置接口拦截器，响应到达后触发看板交互注入。
     */
    public init(): void {
        NetworkHook.getInstance().registerResponseInterceptor({
            id: 'INTERCEPTOR_BIG_SCREEN_CONFIG',
            urlMatcher: (url: string) => url.includes('/pro/BigScreenConfig/GetBigScreenConfigList'),
            handler: (originalJson: any) => {
                this.injectDomInteraction();
                return originalJson;
            }
        });
    }

    /**
     * @method injectDomInteraction
     * @description 轮询等待看板两个指标卡片就位，为第三项数值绑定点击事件以跳转对应报表菜单（幂等，由标记属性防重）。
     */
    private injectDomInteraction(): void {
        domMaster.waitForCondition(() => {
            const rightBoxes = document.querySelectorAll('.content_box .box .right-box');
            if (rightBoxes.length < 2) return false;

            let successfulInjections = 0;
            const targetConfigs = [
                { container: rightBoxes[0], menuTargetText: '工厂产量看板', flag: 'data-enhanced-annual' },
                { container: rightBoxes[1], menuTargetText: '班组产量报表', flag: 'data-enhanced-monthly' }
            ];

            targetConfigs.forEach(config => {
                const numBoxes = config.container.querySelectorAll('.num-box');
                if (numBoxes.length >= 3) {
                    const targetSpan = numBoxes[2].querySelector('.num-1 span.num') as HTMLElement;
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
        if (!domMaster.clickElementByText('.ep-menu-item', targetText)) {
            console.error(`[UI] 导航节点索引失败: ${targetText}`);
        }
    }
}
