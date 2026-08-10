/**
 * @interface IResponseInterceptor
 * @description 响应拦截器规范定义（修复版：拆分前置 IO 与同步篡改）
 */
export interface IResponseInterceptor {
    /** 路由匹配器 */
    urlMatcher: (url: string) => boolean;
    /** 在原生请求发出前的前置异步钩子（用于预拉取跨域依赖数据） */
    beforeRequest?: () => Promise<any>;
    /** 同步篡改响应体的处理器，杜绝异步竞态 */
    handler: (originalJson: any, prefetchData?: any) => any;
}

/**
 * @class NetworkManager
 * @description 网络通讯全域代理单例。
 */
export class NetworkManager {
    private static instance: NetworkManager;
    private headerSniffers: Array<(key: string, value: string) => void> = [];
    private responseInterceptors: IResponseInterceptor[] = [];
    private isInitialized = false;

    private constructor() {}

    /**
     * @method getInstance
     * @returns {NetworkManager}
     */
    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    public init(): void {
        if (this.isInitialized) return;
        this.hijackXHR();
        this.hijackFetch();
        this.isInitialized = true;
    }

    public registerHeaderSniffer(callback: (key: string, value: string) => void): void {
        this.headerSniffers.push(callback);
    }

    public registerResponseInterceptor(interceptor: IResponseInterceptor): void {
        this.responseInterceptors.push(interceptor);
    }

    private triggerHeaderSniffers(key: string, value: string): void {
        this.headerSniffers.forEach(fn => fn(key, value));
    }

    /**
     * @method hijackXHR
     * @description 重构 XHR 劫持逻辑，通过闭包保障前置请求的顺序控制，恢复严格同步读取。
     */
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

                // 封装核心的原生请求放行逻辑
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
                            
                            // 执行【严格同步】的数据篡改
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

                // 判断是否存在前置依赖查询任务，决定是否阻塞放行
                if (matchedInterceptor.beforeRequest) {
                    matchedInterceptor.beforeRequest().then(data => {
                        prefetchData = data;
                        executeSend();
                    }).catch(error => {
                        console.error('[HHJGBIM_Enhance] 前置请求失败，执行降级直连:', error);
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

    /**
     * @method hijackFetch
     * @description Fetch代理同理改造以适配双阶段拦截器。
     */
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
