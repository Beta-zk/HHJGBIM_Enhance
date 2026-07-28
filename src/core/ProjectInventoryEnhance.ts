import { WAREHOUSE_DATA_STATS_URL } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { findArrayWithKey } from '../utils/helpers';
import { BimProjectItem, PlmEntityItem } from '../types';

export class ProjectInventoryEnhance {
    
    private injectTargetData(warehouseJson: any, plmJson: any): any {
        try {
            if (!plmJson) return warehouseJson;

            const plmItems = findArrayWithKey(plmJson, 'Short_Name') || findArrayWithKey(plmJson, 'Project_Name') || [];
            const stateMap = new Map<string, string>();
            plmItems.forEach((item: PlmEntityItem) => {
                const key = item.Short_Name || item.Project_Name;
                if (key && item.State_Name !== undefined) {
                    stateMap.set(key, item.State_Name);
                }
            });

            const warehouseItems = findArrayWithKey(warehouseJson, 'Project_Name') as BimProjectItem[];
            if (warehouseItems && warehouseItems.length > 0) {
                let modifiedCount = 0;
                warehouseItems.forEach(item => {
                    if (item && item.Project_Name) {
                        if (stateMap.has(item.Project_Name)) {
                            item.State_Name = stateMap.get(item.Project_Name)!;
                            modifiedCount++;
                        } else if (item.State_Name === undefined) {
                            item.State_Name = null;
                        }
                    }
                });
                console.log(`[HHJGBIM_Enhance] 拦截成功，注入 ${modifiedCount} 条状态`);
            }
            return warehouseJson;
        } catch (error) {
            console.error('[HHJGBIM_Enhance] 数据解析注入异常:', error);
            return warehouseJson;
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
                const originalResponseTextGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText')?.get;
                const originalResponseGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response')?.get;
                
                let isProcessed = false;
                let cachedText: string | null = null;
                let cachedResponse: any = null;
                let plmDataCache: any = null;

                const processResponseOnce = () => {
                    if (isProcessed) return;
                    isProcessed = true;
                    try {
                        const rawText = originalResponseTextGetter ? originalResponseTextGetter.call(this) : (this as any).response;
                        const originalJson = JSON.parse(rawText);
                        const modifiedJson = self.injectTargetData(originalJson, plmDataCache);
                        cachedText = JSON.stringify(modifiedJson);
                        cachedResponse = this.responseType === 'json' ? modifiedJson : cachedText;
                    } catch (e) {
                        cachedText = originalResponseTextGetter ? originalResponseTextGetter.call(this) : null;
                        cachedResponse = originalResponseGetter ? originalResponseGetter.call(this) : null;
                    }
                };

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

                projectService.fetchProjectEntities().then((plmJson) => { 
                    plmDataCache = plmJson;
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
                const [response, plmJson] = await Promise.all([
                    originalFetch.apply(this, args as any),
                    projectService.fetchProjectEntities()
                ]);
                
                try {
                    const cloneRes = response.clone();
                    const warehouseJson = await cloneRes.json();
                    
                    const modifiedJson = self.injectTargetData(warehouseJson, plmJson);
                    const modifiedStr = JSON.stringify(modifiedJson);
                    
                    return new Proxy(response, {
                        get(target, prop, receiver) {
                            if (prop === 'json') return async () => modifiedJson;
                            if (prop === 'text') return async () => modifiedStr;
                            
                            const value = Reflect.get(target, prop, receiver);
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
