import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { BimProjectItem, PlmEntityItem } from '../types';

/**
 * @class ProjectInventoryEnhance
 * @description 项目库存数据增强模块，负责静态寻址注入核心状态属性，并提供符合静态类型约束的脏数据兜底清洗。
 */
export class ProjectInventoryEnhance {
    
    /**
     * @method injectTargetData
     * @description 执行数据注入解析，统计修改条目，并安全规避 TS2367 异常以实现兜底清洗。
     * @param {any} warehouseJson 仓储原始数据
     * @param {any} plmJson PLM原始数据
     * @returns {any} 突变处理后的新数据对象
     */
    private injectTargetData(warehouseJson: any, plmJson: any): any {
        try {
            if (!plmJson || !warehouseJson) return warehouseJson;

            const plmItems: PlmEntityItem[] = plmJson?.Data?.Data || plmJson?.Data || [];
            const warehouseItems: BimProjectItem[] = warehouseJson?.Data?.Data || [];

            if (warehouseItems.length === 0 || plmItems.length === 0) return warehouseJson;

            const stateMap = new Map<string, string>();
            plmItems.forEach(item => {
                const key = item.Short_Name || item.Project_Name;
                if (key && item.State_Name !== undefined) {
                    stateMap.set(key, item.State_Name);
                }
            });

            let modifiedCount = 0;
            warehouseItems.forEach(item => {
                if (item?.Project_Name) {
                    if (stateMap.has(item.Project_Name)) {
                        item.State_Name = stateMap.get(item.Project_Name)!;
                        modifiedCount++;
                    } else {
                        /** 
                         * @description 脏数据清洗：运用 String() 显式转换消除 TypeScript 静态检查报错（TS2367），
                         * 同步兼容后端可能返回的 string 型 '0' 与 number 型 0。
                         */
                        if (!item.State_Name || String(item.State_Name) === '0') {
                            item.State_Name = '未知';
                        }
                    }
                }
            });
            
            console.log(`[HHJGBIM_Enhance] 拦截成功，静态寻址注入 ${modifiedCount} 条状态`);
            return warehouseJson;
        } catch (error) {
            console.error('[HHJGBIM_Enhance] 数据解析注入异常:', error);
            return warehouseJson;
        }
    }

    /**
     * @method init
     * @description 挂载针对XHR与Fetch底层协议的拦截代理。
     * @returns {void}
     */
    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
    }

    /**
     * @method hijackXHR
     * @description 代理重写 XMLHttpRequest 以介入数据通讯过程。
     * @returns {void}
     */
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

            /** @description 约束判定：锁定对应的数据统计接口进行数据拦截过滤 */
            if (url.includes(API_URLS.WAREHOUSE_DATA_STATS)) {
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
                        if (this.readyState === 4) processResponseOnce();
                        return cachedText !== null ? cachedText : (originalResponseTextGetter ? originalResponseTextGetter.call(this) : '');
                    },
                    configurable: true,
                    enumerable: true
                });

                Object.defineProperty(this, 'response', {
                    get: () => {
                        if (this.readyState === 4) processResponseOnce();
                        return cachedResponse !== null ? cachedResponse : (originalResponseGetter ? originalResponseGetter.call(this) : null);
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

    /**
     * @method hijackFetch
     * @description 代理重写 Fetch 以介入数据通讯过程。
     * @returns {void}
     */
    private hijackFetch(): void {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(...args: any[]) {
            const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');

            /** @description 约束判定：锁定对应的数据统计接口进行数据拦截过滤 */
            if (requestUrl.includes(API_URLS.WAREHOUSE_DATA_STATS)) {
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
