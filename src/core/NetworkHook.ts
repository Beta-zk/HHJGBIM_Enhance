/**
 * @interface IResponseInterceptor
 * @description 响应拦截器规范定义 (V2 增强版)
 */
export interface IResponseInterceptor {
    /** @property {string} id - 拦截器全局唯一标识，用于注册表去重与溯源 */
    id: string;
    urlMatcher: (url: string) => boolean;
    beforeRequest?: () => Promise<any>;
    handler: (originalJson: any, prefetchData?: any) => any;
}

/**
 * @class NetworkHook
 * @description 底层网络通讯挂钩单例。
 */
export class NetworkHook {
    private static instance: NetworkHook;
    private headerSniffers: Array<(key: string, value: string) => void> = [];
    private responseInterceptors: IResponseInterceptor[] = [];
    private isInitialized = false;

    private constructor() {}

    /**
     * @method getInstance
     * @description 获取挂钩基建单例
     * @returns {NetworkHook}
     */
    public static getInstance(): NetworkHook {
        if (!NetworkHook.instance) {
            NetworkHook.instance = new NetworkHook();
        }
        return NetworkHook.instance;
    }

    public init(): void {
        if (this.isInitialized) return;
        this.hijackXHR();
        this.hijackFetch();
        this.isInitialized = true;
        console.log('[HHJGBIM_Enhance] NetworkHook 初始化完毕');
    }

    public registerHeaderSniffer(callback: (key: string, value: string) => void): void {
        this.headerSniffers.push(callback);
    }

    /**
     * @method registerResponseInterceptor
     * @description 注册或覆盖响应拦截器。采用严格 ID 比对以避免内存泄漏与重复执行。
     * @param {IResponseInterceptor} interceptor 实现了规范的拦截器实例
     * @returns {void}
     */
    public registerResponseInterceptor(interceptor: IResponseInterceptor): void {
        const existingIndex = this.responseInterceptors.findIndex(i => i.id === interceptor.id);
        
        if (existingIndex !== -1) {
            console.warn(`[HHJGBIM_Enhance] 拦截器注册表警告: [${interceptor.id}] 已存在，执行覆盖更新策略。`);
            this.responseInterceptors[existingIndex] = interceptor;
        } else {
            this.responseInterceptors.push(interceptor);
        }
    }

    private triggerHeaderSniffers(key: string, value: string): void {
        this.headerSniffers.forEach(fn => fn(key, value));
    }

    private hijackXHR(): void {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        const self = this;

        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            self.triggerHeaderSniffers(header, value);
            return originalSetRequestHeader.apply(this, [header, value]);
        };

        XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
            (this as any)._bizRequestUrl = url.toString();
            return originalOpen.apply(this, arguments as any);
        };

        XMLHttpRequest.prototype.send = function(...args: any[]) {
            const url = (this as any)._bizRequestUrl || '';
            const matchedInterceptor = self.responseInterceptors.find(i => i.urlMatcher(url));

            if (matchedInterceptor) {
                let prefetchData: any = null;
                const xhrInstance = this;

                const executeSend = () => {
                    const originalResponseTextGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText')?.get;
                    const originalResponseGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response')?.get;
                    
                    let isProcessed = false;
                    let cachedText: string | null = null;
                    let cachedResponse: any = null;

                    const processResponseOnce = () => {
                        if (isProcessed) return;
                        isProcessed = true;
                        try {
                            const rawText = originalResponseTextGetter ? originalResponseTextGetter.call(xhrInstance) : (xhrInstance as any).response;
                            const originalJson = JSON.parse(rawText);
                            const modifiedJson = matchedInterceptor.handler(originalJson, prefetchData);
                            cachedText = JSON.stringify(modifiedJson);
                            cachedResponse = xhrInstance.responseType === 'json' ? modifiedJson : cachedText;
                        } catch (e) {
                            cachedText = originalResponseTextGetter ? originalResponseTextGetter.call(xhrInstance) : null;
                            cachedResponse = originalResponseGetter ? originalResponseGetter.call(xhrInstance) : null;
                        }
                    };

                    Object.defineProperty(xhrInstance, 'responseText', {
                        get: () => {
                            if (xhrInstance.readyState === 4) processResponseOnce();
                            return cachedText !== null ? cachedText : (originalResponseTextGetter ? originalResponseTextGetter.call(xhrInstance) : '');
                        },
                        configurable: true,
                        enumerable: true
                    });

                    Object.defineProperty(xhrInstance, 'response', {
                        get: () => {
                            if (xhrInstance.readyState === 4) processResponseOnce();
                            return cachedResponse !== null ? cachedResponse : (originalResponseGetter ? originalResponseGetter.call(xhrInstance) : null);
                        },
                        configurable: true,
                        enumerable: true
                    });

                    originalSend.apply(xhrInstance, args as any);
                };

                if (matchedInterceptor.beforeRequest) {
                    matchedInterceptor.beforeRequest().then(data => {
                        prefetchData = data;
                        executeSend();
                    }).catch(error => {
                        console.error(`[HHJGBIM_Enhance] 前置依赖请求异常 [拦截器: ${matchedInterceptor.id}]，执行降级放行:`, error);
                        executeSend();
                    });
                } else {
                    executeSend();
                }
                return;
            }

            return originalSend.apply(this, args as any);
        };
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = async function(...args: any[]) {
            let headersObj: Headers | null = null;
            if (args[0] instanceof Request) {
                headersObj = args[0].headers;
            } else if (args[1] && args[1].headers) {
                headersObj = new Headers(args[1].headers);
            }
            if (headersObj) {
                headersObj.forEach((value, key) => self.triggerHeaderSniffers(key, value));
            }

            const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
            const matchedInterceptor = self.responseInterceptors.find(i => i.urlMatcher(requestUrl));

            if (matchedInterceptor) {
                let prefetchData: any = null;
                if (matchedInterceptor.beforeRequest) {
                    prefetchData = await matchedInterceptor.beforeRequest().catch(() => null);
                }

                const response = await originalFetch.apply(this, args as any);

                try {
                    const cloneRes = response.clone();
                    const originalJson = await cloneRes.json();
                    
                    const modifiedJson = matchedInterceptor.handler(originalJson, prefetchData);
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
