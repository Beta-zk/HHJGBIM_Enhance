import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { systemService } from '../services/SystemService';
import { NetworkHook } from './NetworkHook';
import { waitForElement } from '../utils/helpers';

/**
 * @class ProjectStateEnhance
 * @description 业务数据重组与视图增强中间件。支持状态生命周期逻辑排序、语义化区块色系，并集成了路由黑名单热卸载机制及跨浮层（如 vxe-table 冻结列）的高度同步机制。
 */
export class ProjectStateEnhance {
    private isCrawlerReady: boolean = false;
    
    private matchMap = new Map<string, string>();
    private uniqueStates = new Set<string>();
    private activeStates = new Set<string>();
    
    private scanTimer: number | null = null;
    private readonly FILTER_CONTAINER_ID = 'hhjg-state-filter-container';
    private readonly STYLE_TAG_ID = 'hhjg-state-enhance-styles';
    
    private dictPromise: Promise<void> | null = null;
    
    // 黑名单路由：一旦命中，强制卸载所有UI注入与监听挂载
    private readonly BLACKLIST_ROUTES = ['/project/plm/projectmanagement'];

    // 核心业务：工程进度生命周期排序权重
    private readonly LOGICAL_ORDER = [
        '投标', 
        '中标未开工', 
        '中标停工', 
        '局部开工', 
        '全面开工', 
        '临时停工', 
        '收尾', 
        '完工未验收', 
        '完工已验收'
    ];

    // 核心业务：语义区块化色系
    private readonly STATE_COLORS: Record<string, string> = {
        '投标': '#409eff',         
        '中标未开工': '#f56c6c',     
        '中标停工': '#f56c6c',       
        '临时停工': '#f56c6c',       
        '局部开工': '#e6a23c',       
        '全面开工': '#e6a23c',       
        '收尾': '#67c23a',           
        '完工未验收': '#67c23a',     
        '完工已验收': '#67c23a'      
    };

    public init(): void {
        this.injectGlobalStyles();

        this.dictPromise = systemService.ping().then(res => {
            this.isCrawlerReady = !!res;
            return projectService.fetchProjectEntities(this.isCrawlerReady);
        }).then(plmJson => {
            this.buildDictionary(plmJson);
            this.activateGlobalObserver(); 
        }).catch(e => {
            console.warn('[ProjectStateEnhance] 全局字典预热失败', e);
        });

        const targetEndpoints = [
            API_URLS.WAREHOUSE_DATA_STATS
        ];

        NetworkHook.getInstance().registerResponseInterceptor({
            id: 'INTERCEPTOR_PROJECT_FILTER',
            urlMatcher: (url: string) => {
                return targetEndpoints.some(endpoint => {
                    try {
                        return new URL(url, window.location.origin).pathname === new URL(endpoint).pathname;
                    } catch (error) {
                        return url.includes(endpoint);
                    }
                });
            },
            handler: (originalJson: any) => {
                if (this.dictPromise) {
                    this.dictPromise.then(() => {
                        this.injectFilterUI(originalJson);
                    });
                }
                return originalJson; 
            }
        });
    }

    /**
     * @private
     * @method injectGlobalStyles
     * @description 预先注入增强类样式，避免在高频 DOM 扫描时触发由于内联样式引发的重排。
     */
    private injectGlobalStyles(): void {
        if (document.getElementById(this.STYLE_TAG_ID)) return;
        const style = document.createElement('style');
        style.id = this.STYLE_TAG_ID;
        style.type = 'text/css';
        style.innerHTML = `
            .hhjg-state-row-enhanced { height: 62px !important; }
            .hhjg-state-cell-enhanced { max-height: none !important; white-space: normal !important; line-height: 1.2 !important; }
            .hhjg-state-badge { display: block; width: max-content; color: white; padding: 3px 6px; border-radius: 4px; margin-top: 6px; font-size: 11px; line-height: 1; }
            .hhjg-state-btn { padding: 0 8px; height: 28px; line-height: 26px; border: 1px solid #409eff; border-radius: 4px; cursor: pointer; user-select: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 11px; box-sizing: border-box; white-space: nowrap; }
            .hhjg-state-btn-active { background-color: #409eff; color: white; }
            .hhjg-state-btn-inactive { background-color: transparent; color: #409eff; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    private buildDictionary(plmJson: any): void {
        if (!plmJson) return;
        
        let items = [];
        if (this.isCrawlerReady) {
            items = plmJson.Data?.Data || plmJson.Data || plmJson || [];
        } else {
            items = plmJson.Data?.Data || [];
        }
        
        this.matchMap.clear();
        this.uniqueStates.clear();

        items.forEach((item: any) => {
            const state = item.State_Name || '未知';
            if (String(state) === '0') return;

            const keyCandidates = [item.Name, item.Project_Name, item.Short_Name, state].filter(Boolean);
            
            keyCandidates.forEach(keyText => {
                this.matchMap.set(String(keyText).trim(), state);
            });
            
            if (state) {
                this.uniqueStates.add(state);
            }
        });
    }

    private getBadgeColor(state: string): string {
        return this.STATE_COLORS[state] || '#409eff';
    }

    /**
     * @private
     * @method cleanupAll
     * @description 样式热回收器。命中黑名单路由时执行，通过清理统一下发的类名快速复原现场。
     */
    private cleanupAll(): void {
        const container = document.getElementById(this.FILTER_CONTAINER_ID);
        if (container) container.remove();

        document.querySelectorAll('.hhjg-state-row-enhanced').forEach(el => {
            el.classList.remove('hhjg-state-row-enhanced');
            (el as HTMLElement).style.display = ''; 
        });

        document.querySelectorAll('.hhjg-state-cell-enhanced').forEach(el => {
            el.classList.remove('hhjg-state-cell-enhanced');
        });

        document.querySelectorAll('.hhjg-state-badge').forEach(badge => badge.remove());
    }

    private injectFilterUI(originalJson?: any): void {
        if (this.BLACKLIST_ROUTES.some(route => window.location.pathname.toLowerCase().includes(route))) {
            return;
        }

        waitForElement('.el-form.el-form--inline').then(formEl => {
            formEl.style.display = '';
            formEl.style.flexWrap = '';
            
            if (document.getElementById(this.FILTER_CONTAINER_ID)) return;

            const container = document.createElement('div');
            container.id = this.FILTER_CONTAINER_ID;
            container.style.cssText = 'display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; width: 100%;';

            const viewStates = new Set<string>();
            if (originalJson && originalJson.Data && Array.isArray(originalJson.Data.Data)) {
                originalJson.Data.Data.forEach((item: any) => {
                    const name = item.Project_Name || item.Name || '';
                    const state = this.matchMap.get(name);
                    if (state) viewStates.add(state);
                });
            }
            
            const statesToRender = viewStates.size > 0 ? viewStates : this.uniqueStates;
            this.activeStates = new Set(statesToRender);

            const sortedStates = Array.from(statesToRender).sort((a, b) => {
                const indexA = this.LOGICAL_ORDER.indexOf(a);
                const indexB = this.LOGICAL_ORDER.indexOf(b);
                const weightA = indexA === -1 ? 999 : indexA;
                const weightB = indexB === -1 ? 999 : indexB;
                return weightA - weightB;
            });

            sortedStates.forEach(state => {
                const btn = document.createElement('div');
                btn.textContent = state;
                btn.className = 'hhjg-state-btn hhjg-state-btn-active';
                
                btn.onclick = () => {
                    if (this.activeStates.has(state)) {
                        this.activeStates.delete(state);
                        btn.className = 'hhjg-state-btn hhjg-state-btn-inactive';
                    } else {
                        this.activeStates.add(state);
                        btn.className = 'hhjg-state-btn hhjg-state-btn-active';
                    }
                    this.debounceScan();
                };
                container.appendChild(btn);
            });

            formEl.insertAdjacentElement('afterend', container);
            this.debounceScan();
        }).catch(e => {
            console.warn('[UI] 状态筛选面板未找到定位锚点', e);
        });
    }

    private activateGlobalObserver(): void {
        const observer = new MutationObserver((mutations) => {
            // 优化点：使用声明式的高阶函数替换繁琐的嵌套循环，精准过滤非目标杂音
            const isOnlyBadgeMutations = Array.from(mutations).every(m => {
                if (m.type !== 'childList') return false;
                
                const checkNodes = (nodes: NodeList) => Array.from(nodes).every(
                    n => n.nodeType === 1 && (n as HTMLElement).classList.contains('hhjg-state-badge')
                );
                
                return checkNodes(m.addedNodes) && checkNodes(m.removedNodes);
            });

            if (isOnlyBadgeMutations) return;
            this.debounceScan();
        });

        observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class']
        });
        
        this.debounceScan();
    }

    private debounceScan(): void {
        if (this.scanTimer) clearTimeout(this.scanTimer);
        this.scanTimer = window.setTimeout(() => {
            this.scanAndApply();
        }, 150);
    }

    /**
     * @private
     * @method scanAndApply
     * @description 执行 DOM 遍历，定位实体并注入视效。
     * 为兼容 vxe-table 的多图层表架构（左右冻结区域为独立的 Table Node），特引入基于 rowid 的状态漫游机制。
     */
    private scanAndApply(): void {
        if (this.BLACKLIST_ROUTES.some(route => window.location.pathname.toLowerCase().includes(route))) {
            this.cleanupAll();
            return;
        }

        const isFilterActive = !!document.getElementById(this.FILTER_CONTAINER_ID);
        const allTrs = Array.from(document.querySelectorAll('table tbody tr'));
        const vxeRowMap = new Map<string, string>(); // 保存主表映射的 { rowid: matchedState }

        type RowMeta = {
            tr: HTMLElement;
            rowid: string | null;
            matchedState: string | null;
            targetElement: HTMLElement | null;
        };

        // 第 1 阶段：信息采集与跨层凭证预注册
        const parsedRows: RowMeta[] = allTrs.map(tr => {
            const rowid = tr.getAttribute('rowid');
            let matchedState: string | null = null;
            let targetElement: HTMLElement | null = null;

            const cells = tr.querySelectorAll('td .cell, td > div');
            for (let i = 0; i < cells.length; i++) {
                const el = cells[i] as HTMLElement;
                const clone = el.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('.hhjg-state-badge').forEach(b => b.remove());
                
                const text = clone.textContent?.trim() || '';
                if (text && this.matchMap.has(text)) {
                    matchedState = this.matchMap.get(text)!;
                    targetElement = el;
                    if (rowid) {
                        vxeRowMap.set(rowid, matchedState);
                    }
                    break;
                }
            }
            
            return { tr: tr as HTMLElement, rowid, matchedState, targetElement };
        });

        // 第 2 阶段：状态消费与样式强制下发（覆盖所有冻结图层内的游离 Node）
        parsedRows.forEach(meta => {
            let finalState = meta.matchedState;
            // 补偿逻辑：如果当前行未命中状态，但同源映射池中有其所属组的状态记录，进行状态漫游同步
            if (!finalState && meta.rowid && vxeRowMap.has(meta.rowid)) {
                finalState = vxeRowMap.get(meta.rowid)!;
            }

            const { tr, targetElement } = meta;

            if (finalState) {
                if (isFilterActive) {
                    tr.style.display = this.activeStates.has(finalState) ? '' : 'none';
                    if (!this.activeStates.has(finalState)) return;
                } else {
                    tr.style.display = '';
                }

                // 为跨表图层的所有关联行统一推进行高与间距控制
                tr.classList.add('hhjg-state-row-enhanced');

                // 对具备核心业务词汇的定位单元格进行精准角标投递
                if (targetElement) {
                    targetElement.classList.add('hhjg-state-cell-enhanced');
                    let badge = targetElement.querySelector(':scope > .hhjg-state-badge') as HTMLElement;
                    const themeColor = this.getBadgeColor(finalState);

                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'hhjg-state-badge';
                        badge.style.backgroundColor = themeColor;
                        targetElement.appendChild(badge);
                    } else if (badge.style.backgroundColor !== themeColor) {
                        badge.style.backgroundColor = themeColor;
                    }
                    
                    if (badge.textContent !== finalState) {
                        badge.textContent = finalState;
                    }
                }
            } else {
                // 安全卸载：确保无残留
                tr.classList.remove('hhjg-state-row-enhanced');
                tr.style.display = ''; 
                tr.querySelectorAll('.hhjg-state-cell-enhanced').forEach(el => {
                    el.classList.remove('hhjg-state-cell-enhanced');
                    el.querySelector(':scope > .hhjg-state-badge')?.remove();
                });
            }
        });
    }
}
