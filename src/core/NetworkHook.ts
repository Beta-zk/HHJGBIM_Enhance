/**
 * @interface IResponseInterceptor
 * @description 网络响应拦截器契约。规范拦截器的标识、路由匹配规则、前置数据预取逻辑及响应体篡改函数。
 */
export interface IResponseInterceptor {
    id: string;
    urlMatcher: (url: string) => boolean;
    beforeRequest?: () => Promise<any>;
    handler: (originalJson: any, prefetchData?: any) => any;
}

/**
 * @class NetworkHook
 * @description 网络通讯挂钩基建。通过侵入式重写 XHR 与 Fetch 原型链，提供无感知的 HTTP 头部嗅探与响应报文重组功能。
 */
export class NetworkHook {
    private static instance: NetworkHook;
    private headerSniffers: Array<(key: string, value: string) => void> = [];
    private responseInterceptors: IResponseInterceptor[] = [];
    private isInitialized = false;

    private constructor() {}

    /**
     * @method getInstance
     * @description 获取网络挂钩单例。
     * @returns {NetworkHook}
     */
    public static getInstance(): NetworkHook {
        if (!NetworkHook.instance) {
            NetworkHook.instance = new NetworkHook();
        }
        return NetworkHook.instance;
    }

    /**
     * @method init
     * @description 激活全局网络劫持引擎，确保单例生命周期内仅执行一次挂载。
     */
    public init(): void {
        if (this.isInitialized) return;
        this.hijackXHR();
        this.hijackFetch();
        this.isInitialized = true;
    }

    /**
     * @method registerHeaderSniffer
     * @description 注册请求头嗅探器，捕获业务流量中的授权凭证。
     * @param {(key: string, value: string) => void} callback
     */
    public registerHeaderSniffer(callback: (key: string, value: string) => void): void {
        this.headerSniffers.push(callback);
    }

    /**
     * @method registerResponseInterceptor
     * @description 挂载响应篡改管线，利用严格 ID 机制防止重复注册造成的内存泄漏。
     * @param {IResponseInterceptor} interceptor
     */
    public registerResponseInterceptor(interceptor: IResponseInterceptor): void {
        const existingIndex = this.responseInterceptors.findIndex(i => i.id === interceptor.id);
        
        if (existingIndex !== -1) {
            console.warn(`[Hook] 拦截器已重置: ${interceptor.id}`);
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
                        console.error(`[Hook] 前置依赖阻断: ${matchedInterceptor.id}`, error);
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
