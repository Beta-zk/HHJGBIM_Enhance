import { WAREHOUSE_DATA_STATS_URL } from '../config/constants';
import { projectStateService } from '../services/ProjectStateService'; 
import { findArrayWithKey } from '../utils/helpers';
import { BimProjectItem } from '../types';

export class ProjectInventoryEnhance {
    private injectTargetData(responseData: any): any {
        try {
            const dataLayer = findArrayWithKey(responseData, 'Project_Name') as BimProjectItem[];
            if (dataLayer && dataLayer.length > 0) {
                let modifiedCount = 0;
                dataLayer.forEach(item => {
                    if (item && item.Project_Name && projectStateService.projectStateMap.has(item.Project_Name)) {
                        item.State_Name = projectStateService.projectStateMap.get(item.Project_Name)!;
                        modifiedCount++;
                    } else if (item && item.Project_Name && item.State_Name === undefined) {
                        item.State_Name = null;
                    }
                });
                console.log(`[HHJGBIM_Enhance] ‘项目库存统计’渲染拦截成功，动态注入 ${modifiedCount} 条数据`);
            }
            return responseData;
        } catch (error) {
            return responseData;
        }
    }

    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
    }

    private hijackXHR(): void {
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
            (this as any)._bizRequestUrl = url.toString();
            return originalXHROpen.apply(this, arguments as any);
        };

        const self = this;
        XMLHttpRequest.prototype.send = function(...args: any[]) {
            const url = (this as any)._bizRequestUrl || '';

            if (url.includes(WAREHOUSE_DATA_STATS_URL)) {
                // 1. 获取原生的 getter 访问器，避免引发无限递归爆栈
                const originalResponseTextGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText')?.get;
                const originalResponseGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response')?.get;
                
                let isProcessed = false;
                let cachedText: string | null = null;
                let cachedResponse: any = null;

                const processResponseOnce = () => {
                    if (isProcessed) return;
                    isProcessed = true;
                    try {
                        const rawText = originalResponseTextGetter ? originalResponseTextGetter.call(this) : (this as any).response;
                        const json = JSON.parse(rawText);
                        const modifiedJson = self.injectTargetData(json);
                        cachedText = JSON.stringify(modifiedJson);
                        cachedResponse = this.responseType === 'json' ? modifiedJson : cachedText;
                    } catch (e) {
                        cachedText = originalResponseTextGetter ? originalResponseTextGetter.call(this) : null;
                        cachedResponse = originalResponseGetter ? originalResponseGetter.call(this) : null;
                    }
                };

                // 2. 直接在实例层覆写 Getter，无视宿主框架的事件绑定顺序
                Object.defineProperty(this, 'responseText', {
                    get: () => {
                        if (this.readyState === 4) {
                            processResponseOnce();
                            return cachedText;
                        }
                        return originalResponseTextGetter ? originalResponseTextGetter.call(this) : '';
                    },
                    configurable: true,
                    enumerable: true
                });

                Object.defineProperty(this, 'response', {
                    get: () => {
                        if (this.readyState === 4) {
                            processResponseOnce();
                            return cachedResponse;
                        }
                        return originalResponseGetter ? originalResponseGetter.call(this) : null;
                    },
                    configurable: true,
                    enumerable: true
                });

                // 3. 阻塞执行，确保前置状态字典已同步
                projectStateService.ensureProjectStateSynced().then(() => { 
                    originalXHRSend.apply(this, args as any); 
                });
            } else {
                originalXHRSend.apply(this, args as any);
            }
        };
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(...args: any[]) {
            const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');

            if (requestUrl.includes(WAREHOUSE_DATA_STATS_URL)) {
                await projectStateService.ensureProjectStateSynced();
                const response = await originalFetch.apply(this, args as any);
                
                try {
                    const cloneRes = response.clone();
                    const json = await cloneRes.json();
                    const modifiedJson = self.injectTargetData(json);
                    const modifiedStr = JSON.stringify(modifiedJson);
                    
                    // 使用 Proxy 代理对象接管原生 Response，确保元数据绝对完整
                    return new Proxy(response, {
                        get(target, prop, receiver) {
                            if (prop === 'json') return async () => modifiedJson;
                            if (prop === 'text') return async () => modifiedStr;
                            
                            const value = Reflect.get(target, prop, receiver);
                            // 修正上下文环境，防止原生方法调用异常
                            return typeof value === 'function' ? value.bind(target) : value;
                        }
                    });
                } catch (error) {
                    return response;
                }
            }
            return await originalFetch.apply(this, args as any);
        };
    }
}
