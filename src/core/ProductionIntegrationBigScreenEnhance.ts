import { NetworkHook } from './NetworkHook';

/**
 * @class ProductionIntegrationBigScreenEnhance
 * @description 生产集成大屏增强类。劫持看板元素点击事件，通过模拟点击宿主侧边栏菜单，实现无缝内部标签页跳转。
 */
export class ProductionIntegrationBigScreenEnhance {
    
    /**
     * @method init
     * @description 初始化挂载网络拦截嗅探器
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
     * @description 异步轮询目标 DOM 容器，注入隔离的点击事件，并执行动态菜单项映射。
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

                // 配置矩阵：将 URL 替换为目标侧边栏菜单的特征文本
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
                                
                                // 注册劫持事件
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
                    console.log('[HHJGBIM_Enhance] 大屏元素劫持：宿主菜单物理级绑定合龙');
                    clearInterval(timer);
                    return;
                }
            }

            if (attempts >= MAX_ATTEMPTS) {
                clearInterval(timer);
                console.warn('[HHJGBIM_Enhance] 大屏元素劫持失败：目标 DOM 树未在规定时间内完整构建');
            }
        }, INTERVAL_MS);
    }

    /**
     * @method triggerSidebarMenuClick
     * @description 在 DOM 树中实时检索指定文本的 Element Plus 菜单项，并派发点击事件。
     * @param {string} targetText 目标菜单包含的唯一特征文本
     */
    private triggerSidebarMenuClick(targetText: string): void {
        // 实时抓取侧边栏列表，规避 SPA 路由切换导致的节点失活问题
        const menuItems = document.querySelectorAll('.ep-menu-item');
        let isMatchFound = false;

        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i] as HTMLElement;
            
            // 采用包含匹配机制，防范 DOM 内存在首尾空格或隐藏换行符
            if (item.textContent && item.textContent.includes(targetText)) {
                // 模拟物理设备点击触发
                item.click();
                isMatchFound = true;
                break;
            }
        }

        if (!isMatchFound) {
            console.error(`[HHJGBIM_Enhance] 宿主交互异常：未能定位到侧边栏节点 [${targetText}]，请检查用户权限或视图状态。`);
        }
    }
}
