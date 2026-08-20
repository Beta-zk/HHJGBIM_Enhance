/**
 * @interface IElementOptions
 * @description 元素工厂配置项。
 */
export interface IElementOptions {
    id?: string;
    className?: string;
    text?: string;
    /** 元素 title 提示 */
    title?: string;
    styles?: Partial<CSSStyleDeclaration>;
    attributes?: Record<string, string>;
}

/**
 * @interface IDraggablePanelOptions
 * @description 可拖拽悬浮面板配置项。
 */
export interface IDraggablePanelOptions {
    /** 容器 DOM id */
    id?: string;
    /** 容器 title 提示 */
    title?: string;
    /** 定位锚点，面板将挂载于该元素内部 */
    mountTarget: HTMLElement;
    /** 面板宽度，默认 280 */
    width?: number;
    /** 初始偏移，默认 12 */
    top?: number;
    left?: number;
    /** 面板基础样式扩展 */
    style?: Partial<CSSStyleDeclaration>;
    /** mousedown 命中判定，返回 false 表示该区域不参与拖拽 */
    isDraggableTarget?: (e: MouseEvent) => boolean;
    /** 面板挂载完成回调，用于填充内容 */
    onReady?: (container: HTMLDivElement) => void;
}

/**
 * @interface IDraggablePanel
 * @description 可拖拽面板句柄，destroy 用于卸载 DOM 与 document 级事件监听。
 */
export interface IDraggablePanel {
    container: HTMLDivElement;
    destroy(): void;
}

/**
 * @interface PageSnapshot
 * @description 页面情报快照：路由、标题与清洗后的可见文本索引，随路由变化重建。
 */
export interface PageSnapshot {
    url: string;
    title: string;
    /** 可见文本索引：清洗文本 → 命中的叶子元素（同名文本可命中多个） */
    textIndex: Map<string, HTMLElement[]>;
    capturedAt: number;
}

/**
 * @class DomMaster
 * @description 宿主页面 DOM 基础设施，两类职责：
 * 1. 通用 DOM 原语：样式注入、元素等待/构建、类名样式、查询定位、可拖拽面板、观察器、交互模拟与表格增强；
 * 2. 页面情报缓存：由 main 激活，监听 SPA 路由变化并重建页面快照（URL/标题/可见文本索引），
 *    提供按文本查找元素/归属的通用查询，供各增强模块按内容定位页面节点。
 */
export class DomMaster {

    private static instance: DomMaster;

    private currentUrl: string = '';
    private snapshot: PageSnapshot | null = null;
    private routeListeners: Array<(url: string) => void> = [];
    private scanTimer: number | null = null;
    private isInitialized: boolean = false;

    private constructor() {}

    /**
     * @method getInstance
     * @description 获取 DomMaster 全局单例。
     * @returns {DomMaster}
     */
    public static getInstance(): DomMaster {
        if (!DomMaster.instance) {
            DomMaster.instance = new DomMaster();
        }
        return DomMaster.instance;
    }

    // ==================== 生命周期 ====================

    /**
     * @method init
     * @description 激活页面情报缓存：记录当前路由、挂载 SPA 路由监听（hash/popstate/history API 钩子），
     * 并在 DOM 就绪后执行首次扫描。仅允许执行一次。
     */
    public init(): void {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.currentUrl = window.location.href;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.scheduleScan());
        } else {
            this.scheduleScan();
        }

        window.addEventListener('hashchange', this.handleRouteChange);
        window.addEventListener('popstate', this.handleRouteChange);
        this.hijackHistoryApi();

        console.log('[DomMaster] 页面情报缓存引擎已激活');
    }

    /**
     * @method refresh
     * @description 强制重建页面快照并通知全部路由订阅者。
     */
    public refresh(): void {
        const snapshot = this.captureSnapshot();
        this.snapshot = snapshot;
        this.routeListeners.forEach(listener => listener(snapshot.url));
    }

    /**
     * @method onRouteChange
     * @description 订阅路由变化。回调在快照重建完成后触发，返回退订函数。
     * @param {(url: string) => void} listener 路由变化回调
     * @returns {Function} 退订函数
     */
    public onRouteChange(listener: (url: string) => void): () => void {
        this.routeListeners.push(listener);
        return () => {
            const index = this.routeListeners.indexOf(listener);
            if (index !== -1) this.routeListeners.splice(index, 1);
        };
    }

    // ==================== 页面情报缓存 ====================

    /**
     * @method getSnapshot
     * @description 获取最近一次页面快照；未激活或未扫描时返回 null。
     * @returns {PageSnapshot | null}
     */
    public getSnapshot(): PageSnapshot | null {
        return this.snapshot;
    }

    /**
     * @method getCurrentUrl
     * @description 获取当前页面完整 URL。
     * @returns {string}
     */
    public getCurrentUrl(): string {
        return window.location.href;
    }

    /**
     * @method getTextIndex
     * @description 获取清洗后的可见文本索引（文本 → 叶子元素）。未激活时返回空索引。
     * @returns {Map<string, HTMLElement[]>}
     */
    public getTextIndex(): Map<string, HTMLElement[]> {
        return this.snapshot?.textIndex ?? new Map();
    }

    /**
     * @method findByText
     * @description 通用按文本定位：在页面文本索引中查找文本命中的元素（默认子串匹配，可精确匹配）。
     * 传入 scope 时跳过索引、在指定容器内实时扫描，用于索引未刷新或局部查找的场景。
     * 调用方如需"归属路径"等复杂语义，应基于返回的元素自行向上遍历实现。
     * @param {string} text 目标文本
     * @param {{exact?: boolean; scope?: HTMLElement}} [options] 匹配选项
     * @returns {HTMLElement[]}
     */
    public findByText(text: string, options: { exact?: boolean; scope?: HTMLElement } = {}): HTMLElement[] {
        if (!text) return [];
        const exact = options.exact ?? false;

        if (options.scope) {
            const results: HTMLElement[] = [];
            this.querySelectorAll<HTMLElement>('*', options.scope).forEach(el => {
                if (el.querySelector(':scope > *')) return;
                const elText = this.cleanText(el.textContent);
                const matched = exact ? elText === text : elText.includes(text);
                if (matched) results.push(el);
            });
            return results;
        }

        const results: HTMLElement[] = [];
        this.getTextIndex().forEach((elements, indexedText) => {
            const matched = exact ? indexedText === text : indexedText.includes(text);
            if (matched) results.push(...elements);
        });
        return results;
    }

    // ==================== 通用工具 ====================

    /**
     * @method debounce
     * @description 防抖包装：连续调用只在停止后 wait 毫秒执行一次。
     * @param {Function} fn 目标函数
     * @param {number} [wait=200] 防抖窗口(ms)
     * @returns {Function} 包装后的函数
     */
    public debounce<T extends (...args: any[]) => void>(fn: T, wait: number = 200): T {
        let timer: number | null = null;
        const debounced = (...args: any[]) => {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                timer = null;
                fn(...args);
            }, wait);
        };
        return debounced as T;
    }

    /**
     * @method throttle
     * @description 节流包装：wait 毫秒内最多执行一次，尾部补一次执行。
     * @param {Function} fn 目标函数
     * @param {number} [wait=200] 节流窗口(ms)
     * @returns {Function} 包装后的函数
     */
    public throttle<T extends (...args: any[]) => void>(fn: T, wait: number = 200): T {
        let lastTime = 0;
        let timer: number | null = null;
        const throttled = (...args: any[]) => {
            const now = Date.now();
            const remaining = wait - (now - lastTime);
            if (remaining <= 0) {
                if (timer) {
                    window.clearTimeout(timer);
                    timer = null;
                }
                lastTime = now;
                fn(...args);
            } else if (!timer) {
                timer = window.setTimeout(() => {
                    lastTime = Date.now();
                    timer = null;
                    fn(...args);
                }, remaining);
            }
        };
        return throttled as T;
    }

    /**
     * @method scrollIntoView
     * @description 滚动定位元素（支持选择器或元素引用），返回是否命中。
     * @param {HTMLElement | string} elOrSelector 目标元素或选择器
     * @param {ScrollIntoViewOptions} [options] 滚动选项
     * @returns {boolean}
     */
    public scrollIntoView(elOrSelector: HTMLElement | string, options?: ScrollIntoViewOptions): boolean {
        const el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
        if (el) {
            el.scrollIntoView(options ?? { behavior: 'smooth', block: 'center' });
            return true;
        }
        return false;
    }

    /**
     * @method getQueryParam
     * @description 读取当前 URL 的查询参数。
     * @param {string} key 参数名
     * @returns {string | null}
     */
    public getQueryParam(key: string): string | null {
        return new URLSearchParams(window.location.search).get(key);
    }

    // ==================== 样式管理 ====================

    /**
     * @method injectStyle
     * @description 幂等注入 <style> 标签，已存在同 id 时跳过。
     * @param {string} id 样式标签唯一标识
     * @param {string} css CSS 文本
     * @returns {boolean} 是否实际注入
     */
    public injectStyle(id: string, css: string): boolean {
        if (document.getElementById(id)) return false;
        const style = document.createElement('style');
        style.id = id;
        style.type = 'text/css';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        return true;
    }

    /**
     * @method removeStyle
     * @description 移除指定 id 的样式标签。
     * @param {string} id 样式标签唯一标识
     */
    public removeStyle(id: string): void {
        document.getElementById(id)?.remove();
    }

    // ==================== DOM 等待 ====================

    /**
     * @method waitForCondition
     * @description 通用异步轮询断言器，轮询直到条件满足或超时。
     * @param {Function} conditionFn 寻址闭包，返回 Truthy 表示寻址成功
     * @param {number} [maxAttempts=20] 最大轮询次数
     * @param {number} [intervalMs=500] 轮询间隔(ms)
     * @returns {Promise<T>}
     */
    public waitForCondition<T>(
        conditionFn: () => T | false | null | undefined,
        maxAttempts: number = 20,
        intervalMs: number = 500
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const timer = window.setInterval(() => {
                attempts++;
                const result = conditionFn();
                if (result) {
                    window.clearInterval(timer);
                    resolve(result);
                } else if (attempts >= maxAttempts) {
                    window.clearInterval(timer);
                    reject(new Error('[DOM] 轮询断言超时'));
                }
            }, intervalMs);
        });
    }

    /**
     * @method waitForElement
     * @description 单一节点异步寻址器（waitForCondition 的语法糖）。
     * @param {string} selector CSS 选择器
     * @param {number} [maxAttempts=20] 最大轮询次数
     * @param {number} [intervalMs=500] 轮询间隔(ms)
     * @returns {Promise<T>}
     */
    public waitForElement<T extends HTMLElement = HTMLElement>(
        selector: string,
        maxAttempts: number = 20,
        intervalMs: number = 500
    ): Promise<T> {
        return this.waitForCondition<T>(
            () => document.querySelector(selector) as T | null,
            maxAttempts,
            intervalMs
        ).catch(() => {
            throw new Error(`[DOM] 节点轮询寻址超时: ${selector}`);
        });
    }

    // ==================== 类名与样式 ====================

    /**
     * @method addClass
     * @description 为元素添加类名（classList.add 本身幂等）。
     */
    public addClass(el: HTMLElement, className: string): void {
        el.classList.add(className);
    }

    /**
     * @method removeClass
     * @description 从元素移除类名。
     */
    public removeClass(el: HTMLElement, className: string): void {
        el.classList.remove(className);
    }

    /**
     * @method toggleClass
     * @description 切换元素类名，可选强制状态。
     */
    public toggleClass(el: HTMLElement, className: string, force?: boolean): void {
        el.classList.toggle(className, force);
    }

    /**
     * @method setStyle
     * @description 批量覆盖元素行内样式。
     */
    public setStyle(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
        Object.assign(el.style, styles);
    }

    // ==================== 查询与定位 ====================

    /**
     * @method getElementById
     * @description 按 id 获取 DOM 节点。
     */
    public getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
        return document.getElementById(id) as T | null;
    }

    /**
     * @method querySelectorAll
     * @description 查询满足选择器的元素数组（默认全局，可指定根节点）。
     */
    public querySelectorAll<T extends Element = Element>(selector: string, root: ParentNode = document): T[] {
        return Array.from(root.querySelectorAll(selector)) as T[];
    }

    /**
     * @method findElementByText
     * @description 在指定选择器集合中查找首个文本包含目标内容的元素。
     */
    public findElementByText(selector: string, text: string): HTMLElement | null {
        const nodes = this.querySelectorAll<HTMLElement>(selector);
        return nodes.find(node => !!node.textContent && node.textContent.includes(text)) ?? null;
    }

    /**
     * @method clickElementByText
     * @description 点击文本包含目标内容的元素，返回是否命中。
     */
    public clickElementByText(selector: string, text: string): boolean {
        const el = this.findElementByText(selector, text);
        if (el) {
            el.click();
            return true;
        }
        return false;
    }

    /**
     * @method isUrlMatch
     * @description 判断当前页面 URL 是否命中任一关键字（不区分大小写）。
     * @param {string[]} patterns 路由关键字名单
     */
    public isUrlMatch(patterns: string[]): boolean {
        const currentUrl = window.location.href.toLowerCase();
        return patterns.some(route => currentUrl.includes(route.toLowerCase()));
    }

    // ==================== 元素构建 ====================

    /**
     * @method createElement
     * @description 类型安全的元素工厂，统一声明类名、文本、样式与属性。
     * @param {K} tag 标签名
     * @param {IElementOptions} [options] 构建选项
     * @returns {HTMLElementTagNameMap[K]}
     */
    public createElement<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        options: IElementOptions = {}
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);
        if (options.id) el.id = options.id;
        if (options.className) el.className = options.className;
        if (options.text !== undefined) el.textContent = options.text;
        if (options.title) el.title = options.title;
        if (options.styles) Object.assign(el.style, options.styles);
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => el.setAttribute(key, value));
        }
        return el;
    }

    /**
     * @method upsertIndicator
     * @description 状态圆点指示器：不存在则创建，存在则仅同步颜色。
     * @param {HTMLElement} container 宿主元素
     * @param {string} color 圆点颜色
     */
    public upsertIndicator(container: HTMLElement, color: string): void {
        let indicator = container.querySelector<HTMLElement>(':scope > .hhjg-state-indicator');
        if (!indicator) {
            indicator = this.createElement('span', {
                className: 'hhjg-state-indicator',
                styles: { backgroundColor: color }
            });
            container.appendChild(indicator);
        } else if (indicator.style.backgroundColor !== color) {
            indicator.style.backgroundColor = color;
        }
    }

    // ==================== 可拖拽面板 ====================

    /**
     * @method createDraggablePanel
     * @description 创建带边界约束的绝对定位悬浮面板，支持拖拽与事件清理。
     * 面板挂载前会自动将锚点提升为 relative 定位上下文。
     * @param {IDraggablePanelOptions} options 面板配置
     * @returns {IDraggablePanel} 面板句柄
     */
    public createDraggablePanel(options: IDraggablePanelOptions): IDraggablePanel {
        const { mountTarget } = options;

        if (window.getComputedStyle(mountTarget).position === 'static') {
            mountTarget.style.position = 'relative';
        }

        const container = this.createElement('div', {
            id: options.id,
            title: options.title,
            styles: {
                position: 'absolute',
                top: `${options.top ?? 12}px`,
                left: `${options.left ?? 12}px`,
                zIndex: '999999',
                width: `${options.width ?? 280}px`,
                cursor: 'move',
                userSelect: 'none',
                ...options.style
            }
        });

        mountTarget.appendChild(container);
        options.onReady?.(container);

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initLeft = options.left ?? 12;
        let initTop = options.top ?? 12;

        const onMouseDown = (e: MouseEvent) => {
            if (options.isDraggableTarget && !options.isDraggableTarget(e)) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initLeft = parseInt(container.style.left || '12', 10);
            initTop = parseInt(container.style.top || '12', 10);
            e.preventDefault();
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const wrapperRect = mountTarget.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const maxLeft = wrapperRect.width - containerRect.width;
            const maxTop = wrapperRect.height - containerRect.height;

            container.style.left = `${Math.max(0, Math.min(initLeft + dx, maxLeft))}px`;
            container.style.top = `${Math.max(0, Math.min(initTop + dy, maxTop))}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        container.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        const destroy = () => {
            container.remove();
            container.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        return { container, destroy };
    }

    // ==================== DOM 观察 ====================

    /**
     * @method observeDom
     * @description MutationObserver 封装，观察 document.body 的 DOM 变更。
     * @param {MutationCallback} callback 变更回调
     * @param {MutationObserverInit} [options] 观察选项
     * @returns {Function} disconnect 函数
     */
    public observeDom(callback: MutationCallback, options?: MutationObserverInit): () => void {
        const observer = new MutationObserver(callback);
        observer.observe(document.body, options ?? { childList: true, subtree: true });
        return () => observer.disconnect();
    }

    // ==================== 交互模拟 ====================

    /**
     * @method setValueAndNotify
     * @description 为输入控件赋值并派发 input/change 事件，驱动宿主框架响应。
     * @param {HTMLInputElement | HTMLTextAreaElement} el 目标输入控件
     * @param {string} value 待写入的值
     */
    public setValueAndNotify(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ==================== 表格能力 ====================

    /**
     * @method getRowCellEntries
     * @description 提取表格行内候选单元格的「元素 + 纯净文本」，文本已剔除指示器噪声。
     * @param {HTMLElement} tr 表格行
     * @returns {Array<{el: HTMLElement; text: string}>}
     */
    public getRowCellEntries(tr: HTMLElement): Array<{ el: HTMLElement; text: string }> {
        const cells = tr.querySelectorAll<HTMLElement>('td .cell, td > div, td .vxe-cell');
        const entries: Array<{ el: HTMLElement; text: string }> = [];
        cells.forEach(cell => {
            const clone = cell.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.hhjg-state-indicator').forEach(b => b.remove());
            entries.push({ el: cell, text: this.cleanText(clone.textContent) });
        });
        return entries;
    }

    /**
     * @method recomputeVxeFooterTotals
     * @description 重算 vxe 表格页脚汇总：基于可见行求和，保留原始文本缓存与数值格式（小数位、千分位）。
     * @param {boolean} [isAllActive=false] 全量可见时恢复原始文本
     */
    public recomputeVxeFooterTotals(isAllActive: boolean = false): void {
        const vxeTables = this.querySelectorAll<HTMLElement>('.vxe-table');

        vxeTables.forEach(vxeContainer => {
            const tbody = vxeContainer.querySelector('.vxe-table--body tbody');
            const tfoot = vxeContainer.querySelector('.vxe-table--footer tfoot');

            if (!tbody || !tfoot) return;

            const visibleRows = Array.from(tbody.querySelectorAll<HTMLElement>('tr'))
                .filter(tr => tr.style.display !== 'none');
            const tfootRows = Array.from(tfoot.querySelectorAll<HTMLElement>('tr'));

            tfootRows.forEach(tRow => {
                const fCells = Array.from(tRow.querySelectorAll<HTMLElement>('th, td'));

                fCells.forEach((fCell, colIndex) => {
                    let innerTarget = fCell.querySelector<HTMLElement>('.vxe-cell--item');
                    if (!innerTarget) innerTarget = fCell.querySelector<HTMLElement>('.vxe-cell');
                    if (!innerTarget) innerTarget = fCell;

                    if (!innerTarget.hasAttribute('data-orig-text')) {
                        innerTarget.setAttribute('data-orig-text', this.cleanText(innerTarget.textContent));
                    }

                    const origText = innerTarget.getAttribute('data-orig-text') || '';

                    if (isAllActive) {
                        if (innerTarget.textContent !== origText) {
                            innerTarget.textContent = origText;
                        }
                        return;
                    }

                    const cleanOrig = origText.replace(/,/g, '');
                    const isNumeric = cleanOrig !== '' && !isNaN(Number(cleanOrig));
                    if (!isNumeric) return;

                    let sum = 0;
                    visibleRows.forEach(tr => {
                        const rowCells = Array.from(tr.querySelectorAll<HTMLElement>('td, th'));
                        const bodyCell = rowCells[colIndex];
                        if (bodyCell) {
                            const cellText = bodyCell.textContent || '';
                            const cellValStr = cellText.replace(/,/g, '').trim();
                            const val = parseFloat(cellValStr);
                            if (!isNaN(val)) sum += val;
                        }
                    });

                    const match = origText.match(/\.(\d+)/);
                    const decimals = match ? match[1].length : 0;
                    const hasComma = origText.includes(',');

                    const factor = Math.pow(10, decimals);
                    const roundedSum = Math.round(sum * factor) / factor;

                    let finalStr = roundedSum.toFixed(decimals);

                    if (hasComma) {
                        finalStr = Number(finalStr).toLocaleString('en-US', {
                            minimumFractionDigits: decimals,
                            maximumFractionDigits: decimals
                        });
                    }

                    if (innerTarget.textContent !== finalStr) {
                        innerTarget.textContent = finalStr;
                    }
                });
            });
        });
    }

    // ==================== 内部实现 ====================

    private captureSnapshot(): PageSnapshot {
        return {
            url: window.location.href,
            title: document.title,
            textIndex: this.buildTextIndex(),
            capturedAt: Date.now()
        };
    }

    /**
     * @method cleanText
     * @description 文本数据清洗：折叠连续空白并去除首尾空白。
     * @param {string | null} text 原始文本
     * @returns {string} 清洗后文本
     */
    private cleanText(text: string | null): string {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    /**
     * @method buildTextIndex
     * @description 扫描页面叶子元素（过滤 script/style 与脚本自身 UI），清洗文本后构建「文本 → 元素」索引。
     * 仅收录叶子节点，避免父容器文本与子节点重复计数。
     * @returns {Map<string, HTMLElement[]>}
     */
    private buildTextIndex(): Map<string, HTMLElement[]> {
        const index = new Map<string, HTMLElement[]>();

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                const el = node as HTMLElement;
                const tag = el.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'NOSCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                if (el.id === 'hhjgbim-vue-root' || el.closest('#hhjgbim-vue-root')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return el.querySelector(':scope > *') ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
            }
        });

        let node: Node | null;
        while ((node = walker.nextNode())) {
            const el = node as HTMLElement;
            const text = this.cleanText(el.textContent);
            if (!text) continue;

            const bucket = index.get(text);
            if (bucket) {
                bucket.push(el);
            } else {
                index.set(text, [el]);
            }
        }

        return index;
    }

    private handleRouteChange = (): void => {
        const nextUrl = window.location.href;
        if (nextUrl === this.currentUrl) return;
        this.currentUrl = nextUrl;
        this.scheduleScan();
    };

    private scheduleScan(): void {
        if (this.scanTimer) window.clearTimeout(this.scanTimer);
        this.scanTimer = window.setTimeout(() => {
            this.refresh();
        }, 400);
    }

    private hijackHistoryApi(): void {
        const originalPush = history.pushState;
        const originalReplace = history.replaceState;

        history.pushState = (...args: Parameters<typeof originalPush>) => {
            originalPush.apply(history, args);
            this.handleRouteChange();
        };

        history.replaceState = (...args: Parameters<typeof originalReplace>) => {
            originalReplace.apply(history, args);
            this.handleRouteChange();
        };
    }
}

export const domMaster = DomMaster.getInstance();
