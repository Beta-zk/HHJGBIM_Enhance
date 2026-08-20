import { API_URLS } from '../../config/constants';
import { projectService } from '../../services/ProjectService';
import { systemService } from '../../services/SystemService';
import { ProjectListHost } from '../../host/projectList';
import type { IDraggablePanel } from '../../core/DomMaster';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';

const STATE_ENHANCE_STYLES = `
    .hhjg-state-row-enhanced { height: 62px !important; }
    .hhjg-state-cell-enhanced { position: relative !important; max-height: none !important; white-space: normal !important; line-height: 1.2 !important; }
    .hhjg-state-indicator { position: absolute; top: 4px; left: 4px; width: 8px; height: 8px; border-radius: 50%; display: block; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10; pointer-events: none; }
    
    .hhjg-state-btn { 
        width: 80px; 
        padding: 0 2px;
        height: 26px; 
        line-height: 24px;
        font-size: 11px;
        border: 1px solid; 
        border-radius: 4px; 
        cursor: pointer; 
        user-select: none; 
        transition: background-color 0.2s, color 0.2s; 
        box-sizing: border-box; 
        white-space: nowrap; 
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

/**
 * @class ProjectStateEnhance
 * @description 项目状态生命周期增强模块。基于项目实体字典为表格行匹配状态，注入语义化色系指示器、
 * 悬浮式状态筛选面板，并在筛选时重算 vxe 表格页脚汇总。所有宿主页面 DOM 操作经 ModuleContext.dom
 * 委托 DomMaster，本类仅保留业务编排与数据重组逻辑。
 */
class ProjectStateEnhance implements IEnhanceModule {
    public readonly id = 'project-state';
    public readonly title = '项目状态生命周期增强';
    public readonly description = '为项目表格动态注入生命周期状态指示器及全局筛选面板。';
    public readonly defaultEnabled = true;
    public readonly settingsKey = 'enableProjectState';

    public readonly interceptors = [{
        id: 'INTERCEPTOR_PROJECT_FILTER',
        urlMatcher: [API_URLS.WAREHOUSE_DATA_STATS, API_URLS.GET_RAW_WH_SUMMARY_LIST].map(endpoint => ({ pathname: endpoint })),
        onResponse: (originalJson: any) => {
            if (this.dictPromise) {
                this.dictPromise.then(() => {
                    if (this.checkWhitelistMatch()) {
                        this.injectFilterUI(originalJson);
                    }
                });
            }
        }
    }];

    private ctx!: ModuleContext;
    private isCrawlerReady: boolean = false;
    
    private matchMap = new Map<string, string>();
    private uniqueStates = new Set<string>();
    private activeStates = new Set<string>();
    private totalStatesCount: number = 0;
    
    private scanTimer: number | null = null;
    private isInjectingUI: boolean = false;
    private observerDisconnect: (() => void) | null = null;
    private filterPanel: IDraggablePanel | null = null;
    private readonly FILTER_CONTAINER_ID = 'hhjg-state-filter-container';
    private readonly STYLE_TAG_ID = 'hhjg-state-enhance-styles';
    public readonly styleIds = [this.STYLE_TAG_ID];
    
    private dictPromise: Promise<void> | null = null;

    // 黑名单路由：一旦命中，强制卸载所有UI注入与监听挂载
    private readonly BLACKLIST_ROUTES = ['/project/plm/projectmanagement'];

    // 白名单路由：仅在命中以下关键字的 URL 时，才允许挂载可移动状态悬浮窗
    private readonly WHITELIST_ROUTES = [
        '/produce/pro/project-inventory',
        '/produce/pro/progress_track'
    ];

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

    /**
     * @method init
     * @description 注入增强样式，预热项目实体字典（含爬虫探活降级）。拦截器由 EnhanceManager 按声明注册。
     * @param {ModuleContext} ctx 模块运行上下文（DOM 基建 + 配置读取）
     */
    public init(ctx: ModuleContext): void {
        this.ctx = ctx;
        ctx.dom.injectStyle(this.STYLE_TAG_ID, STATE_ENHANCE_STYLES);

        this.dictPromise = systemService.ping().then(res => {
            this.isCrawlerReady = !!res;
            return projectService.fetchProjectEntities(this.isCrawlerReady);
        }).then(plmJson => {
            this.buildDictionary(plmJson);
            this.activateGlobalObserver(); 
        }).catch(e => {
            console.warn('[ProjectStateEnhance] 全局字典预热失败', e);
        });
    }

    /**
     * @method destroy
     * @description 卸载模块：清理面板与行增强痕迹、断开全局观察器，并注销自身拦截器与样式（由 manager 执行）。
     */
    public destroy(): void {
        this.cleanupAll();
        this.observerDisconnect?.();
        this.observerDisconnect = null;
        this.dictPromise = null;
    }

    /**
     * @method buildDictionary
     * @description 由 PLM 实体数据构建「名称/项目名/简称/状态 → 状态」的匹配字典，并收集去重后的状态集合。
     * 兼容爬虫源（Data.Data / Data / 裸数组）与宿主源（Data.Data）两种报文结构。
     * @param {any} plmJson 项目实体响应报文
     */
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

    /**
     * @method getBadgeColor
     * @description 返回状态对应的语义色，未配置时回退为默认蓝。
     * @param {string} state 生命周期状态
     * @returns {string} 色值
     */
    private getBadgeColor(state: string): string {
        return this.STATE_COLORS[state] || '#409eff';
    }

    /**
     * @method checkBlacklistMatch
     * @description 判断当前路由是否命中黑名单（命中则整模块停用）。
     */
    private checkBlacklistMatch(): boolean {
        return this.ctx.dom.isUrlMatch(this.BLACKLIST_ROUTES);
    }

    /**
     * @method checkWhitelistMatch
     * @description 判断当前路由是否命中白名单（仅白名单页允许挂载筛选面板）。
     */
    private checkWhitelistMatch(): boolean {
        return this.ctx.dom.isUrlMatch(this.WHITELIST_ROUTES);
    }

    /**
     * @method isFilterActive
     * @description 基于 DOM 存在性判断筛选面板是否已挂载（兜底 SPA 内容切换后容器被销毁的场景）。
     */
    private get isFilterActive(): boolean {
        return this.ctx.dom.getElementById(this.FILTER_CONTAINER_ID) !== null;
    }

    /**
     * @method cleanupAll
     * @description 卸载筛选面板并清理全部行/单元格增强类与状态指示器，恢复页面原貌。
     */
    private cleanupAll(): void {
        if (this.filterPanel) {
            this.filterPanel.destroy();
            this.filterPanel = null;
        }

        this.ctx.dom.querySelectorAll<HTMLElement>('.hhjg-state-row-enhanced').forEach(el => {
            this.ctx.dom.removeClass(el, 'hhjg-state-row-enhanced');
            el.style.display = ''; 
        });

        this.ctx.dom.querySelectorAll<HTMLElement>('.hhjg-state-cell-enhanced').forEach(el => {
            this.ctx.dom.removeClass(el, 'hhjg-state-cell-enhanced');
        });

        this.ctx.dom.querySelectorAll<HTMLElement>('.hhjg-state-indicator').forEach(indicator => indicator.remove());
    }

    /**
     * @method injectFilterUI
     * @description 在页面内容区挂载可拖拽的状态筛选面板：由当前视图数据推导状态集合（缺省用全局字典），
     * 按生命周期逻辑序渲染状态按钮，默认排除已完结状态。面板重建前先卸载旧实例，防止事件监听残留。
     * @param {any} [originalJson] 触发注入的接口响应报文，用于提取视图内实际状态
     */
    private injectFilterUI(originalJson?: any): void {
        if (!this.checkWhitelistMatch() || this.isFilterActive) {
            return;
        }

        ProjectListHost.getFilterPanelAnchor().then(wrapperEl => {
            if (this.isFilterActive) return;

            const viewStates = new Set<string>();
            if (originalJson && originalJson.Data && Array.isArray(originalJson.Data.Data)) {
                originalJson.Data.Data.forEach((item: any) => {
                    const name = item.Project_Name || item.Name || '';
                    const state = this.matchMap.get(name);
                    if (state) viewStates.add(state);
                });
            }
            
            const statesToRender = viewStates.size > 0 ? viewStates : this.uniqueStates;
            this.totalStatesCount = statesToRender.size;
            
            const defaultExcludedStates = new Set(['收尾', '完工未验收', '完工已验收']);
            this.activeStates = new Set(Array.from(statesToRender).filter(state => !defaultExcludedStates.has(state)));

            const sortedStates = Array.from(statesToRender).sort((a, b) => {
                const indexA = this.LOGICAL_ORDER.indexOf(a);
                const indexB = this.LOGICAL_ORDER.indexOf(b);
                const weightA = indexA === -1 ? 999 : indexA;
                const weightB = indexB === -1 ? 999 : indexB;
                return weightA - weightB;
            });

            // 重建面板前先卸载旧面板，避免 SPA 内容切换后 document 级监听残留
            if (this.filterPanel) {
                this.filterPanel.destroy();
                this.filterPanel = null;
            }

            this.filterPanel = this.ctx.dom.createDraggablePanel({
                id: this.FILTER_CONTAINER_ID,
                title: "按住背景可拖动面板",
                mountTarget: wrapperEl,
                width: 280,
                top: 12,
                left: 12,
                style: {
                    backgroundColor: 'rgba(210, 215, 220, 0.7)',
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    borderRadius: '6px',
                    padding: '10px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                },
                isDraggableTarget: (e) => !(e.target as HTMLElement).classList.contains('hhjg-state-btn'),
                onReady: (container) => {
                    sortedStates.forEach(state => {
                        const themeColor = this.getBadgeColor(state);
                        const btn = this.ctx.dom.createElement('div', {
                            className: 'hhjg-state-btn',
                            text: state,
                            styles: { borderColor: themeColor }
                        });

                        const updateBtnStyle = (isActive: boolean) => {
                            btn.style.backgroundColor = isActive ? themeColor : 'transparent';
                            btn.style.color = isActive ? 'white' : themeColor;
                        };

                        updateBtnStyle(this.activeStates.has(state));

                        btn.onclick = () => {
                            if (this.activeStates.has(state)) {
                                this.activeStates.delete(state);
                            } else {
                                this.activeStates.add(state);
                            }
                            updateBtnStyle(this.activeStates.has(state));
                            this.debounceScan();
                        };
                        container.appendChild(btn);
                    });
                }
            });

            this.debounceScan();
        }).catch(e => {
            console.warn('[UI] 悬浮面板未找到定位锚点', e);
        });
    }

    /**
     * @method activateGlobalObserver
     * @description 挂载全局 DOM 变更观察器，过滤自身指示器增删造成的自触发，其余变更一律防抖重扫。
     * 观察器句柄保存于 observerDisconnect，供 destroy 回收。
     */
    private activateGlobalObserver(): void {
        this.observerDisconnect = this.ctx.dom.observeDom((mutations) => {
            const isOnlyIndicatorMutations = Array.from(mutations).every(m => {
                if (m.type !== 'childList') return false;
                
                const checkNodes = (nodes: NodeList) => Array.from(nodes).every(
                    n => n.nodeType === 1 && (n as HTMLElement).classList.contains('hhjg-state-indicator')
                );
                
                return checkNodes(m.addedNodes) && checkNodes(m.removedNodes);
            });

            if (isOnlyIndicatorMutations) return;
            this.debounceScan();
        }, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class']
        });
        
        this.debounceScan();
    }

    /**
     * @method debounceScan
     * @description 150ms 防抖后执行表格扫描，合并高频 DOM 变更。
     */
    private debounceScan(): void {
        if (this.scanTimer) clearTimeout(this.scanTimer);
        this.scanTimer = window.setTimeout(() => {
            this.scanAndApply();
        }, 150);
    }

    /**
     * @method scanAndApply
     * @description 核心扫描流程：按黑白名单裁决面板注入/卸载；逐行匹配状态并应用行高亮、
     * 单元格指示器与筛选显隐；行内未命中时回填同 rowid 行的匹配结果；最后重算页脚汇总。
     */
    private scanAndApply(): void {
        if (this.checkBlacklistMatch()) {
            this.cleanupAll();
            return;
        }

        const isWhitelist = this.checkWhitelistMatch();
        const isFilterActive = this.isFilterActive;

        if (isWhitelist && !isFilterActive) {
            if (!this.isInjectingUI && this.dictPromise) {
                this.isInjectingUI = true;
                this.dictPromise.then(() => {
                    this.injectFilterUI();
                }).finally(() => {
                    this.isInjectingUI = false;
                });
            }
        } else if (!isWhitelist && isFilterActive) {
            this.cleanupAll(); 
        }

        const allTrs = this.ctx.dom.querySelectorAll<HTMLElement>(ProjectListHost.ROW_SELECTOR);
        const vxeRowMap = new Map<string, string>();

        type RowMeta = {
            tr: HTMLElement;
            rowid: string | null;
            matchedState: string | null;
            targetElement: HTMLElement | null;
        };

        const parsedRows: RowMeta[] = allTrs.map(tr => {
            const rowid = tr.getAttribute('rowid');
            let matchedState: string | null = null;
            let targetElement: HTMLElement | null = null;

            const entries = this.ctx.dom.getRowCellEntries(tr);
            for (const entry of entries) {
                if (entry.text && this.matchMap.has(entry.text)) {
                    matchedState = this.matchMap.get(entry.text)!;
                    targetElement = entry.el;
                    if (rowid) {
                        vxeRowMap.set(rowid, matchedState);
                    }
                    break;
                }
            }
            
            return { tr, rowid, matchedState, targetElement };
        });

        const isFilterContext = isWhitelist && this.isFilterActive;

        parsedRows.forEach(meta => {
            let finalState = meta.matchedState;
            if (!finalState && meta.rowid && vxeRowMap.has(meta.rowid)) {
                finalState = vxeRowMap.get(meta.rowid)!;
            }

            const { tr, targetElement } = meta;

            if (finalState) {
                if (isFilterContext) {
                    tr.style.display = this.activeStates.has(finalState) ? '' : 'none';
                } else {
                    tr.style.display = '';
                }

                this.ctx.dom.addClass(tr, 'hhjg-state-row-enhanced');

                if (targetElement) {
                    this.ctx.dom.addClass(targetElement, 'hhjg-state-cell-enhanced');
                    this.ctx.dom.upsertIndicator(targetElement, this.getBadgeColor(finalState));
                }
            } else {
                this.ctx.dom.removeClass(tr, 'hhjg-state-row-enhanced');
                tr.style.display = ''; 
                tr.querySelectorAll('.hhjg-state-cell-enhanced').forEach(el => {
                    this.ctx.dom.removeClass(el as HTMLElement, 'hhjg-state-cell-enhanced');
                    el.querySelector(':scope > .hhjg-state-indicator')?.remove();
                });
            }
        });

        this.updateFooter(!isFilterContext);
    }

    /**
     * @method updateFooter
     * @description 重算 vxe 页脚汇总：全量可见或强制复位时恢复原始文本，否则按可见行重新求和。
     * @param {boolean} [forceReset=false] 强制恢复页脚原始文本
     */
    private updateFooter(forceReset: boolean = false): void {
        const isAllActive = forceReset || (this.activeStates.size === this.totalStatesCount);
        this.ctx.dom.recomputeVxeFooterTotals(isAllActive);
    }
}

export const projectStateEnhance = new ProjectStateEnhance();
