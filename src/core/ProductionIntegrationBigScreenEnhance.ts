import { NetworkHook } from './NetworkHook';

/**
 * @class ProductionIntegrationBigScreenEnhance
 * @description UI 层交互增强组件。通过 DOM 轮询与事件委托机制，将静态看板元素与宿主 SPA 路由实现跨层级桥接。
 */
export class ProductionIntegrationBigScreenEnhance {
    
    /**
     * @method init
     * @description 初始化生命周期，注入看板路由网络嗅探器。
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
     * @description 异步轮询目标 DOM 容器，实现隔离事件的透明注入。
     * @private
     */
    private injectDomInteraction(): void {
        const MAX_ATTEMPTS = 20;
        const INTERVAL_MS = 500;
        let attempts = 0;

        const timer = setInterval(() => {
            attempts++;
            const rightBoxes = document.querySelectorAll('.content_box .box .right-box');
            
            if (rightBoxes.length >= 2) {
                let successfulInjections = 0;

                const targetConfigs = [
                    { 
                        container: rightBoxes[0], 
                        menuTargetText: '工厂产量看板', 
                        flag: 'data-enhanced-annual' 
                    },
                    { 
                        container: rightBoxes[1], 
                        menuTargetText: '班组产量报表', 
                        flag: 'data-enhanced-monthly' 
                    }
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
                                successfulInjections++;
                            } else {
                                successfulInjections++;
                            }
                        }
                    }
                });

                if (successfulInjections === targetConfigs.length) {
                    console.log('[UI] 大屏交互挂载成功');
                    clearInterval(timer);
                    return;
                }
            }

            if (attempts >= MAX_ATTEMPTS) {
                clearInterval(timer);
                console.warn('[UI] 目标 DOM 树超时未就绪');
            }
        }, INTERVAL_MS);
    }

    /**
     * @method triggerSidebarMenuClick
     * @description 在 DOM 树中检索特征菜单节点并派发物理级点击事件。
     * @param {string} targetText 目标特征文本
     * @private
     */
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
            console.error(`[UI] 侧边栏节点未命中: ${targetText}`);
        }
    }
}
