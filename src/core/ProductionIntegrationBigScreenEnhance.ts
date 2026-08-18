import { NetworkHook } from './NetworkHook';
import { waitForCondition } from '../utils/helpers';

/**
 * @class ProductionIntegrationBigScreenEnhance
 * @description 生产看板交互增强引擎。通过监听特定数据接口触发 DOM 轮询机制，实施无侵入式的元素劫持与点击穿透路由绑定。
 */
export class ProductionIntegrationBigScreenEnhance {
    
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

    private injectDomInteraction(): void {
        waitForCondition(() => {
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

    private triggerSidebarMenuClick(targetText: string): void {
        const menuItems = document.querySelectorAll('.ep-menu-item');
        let isMatchFound = false;

        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i] as HTMLElement;
            if (item.textContent && item.textContent.includes(targetText)) {
                item.click();
                isMatchFound = true;
                break;
            }
        }

        if (!isMatchFound) {
            console.error(`[UI] 导航节点索引失败: ${targetText}`);
        }
    }
}
