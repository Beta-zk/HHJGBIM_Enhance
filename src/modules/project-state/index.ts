import { watch, type WatchStopHandle } from 'vue';
import { projectService } from '../../services/ProjectService';
import { systemService } from '../../services/SystemService';
import { ProjectListHost } from '../../host/projectList';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';
import { projectStateStore } from './store';
import ProjectFilterPanel from './view/ProjectFilterPanel.vue';

const STATE_ENHANCE_STYLES = `
    .hhjg-state-cell-enhanced { position: relative !important; padding-left: 16px !important; }
    .hhjg-state-indicator { position: absolute; top: 50%; left: 4px; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; display: block; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10; pointer-events: auto; cursor: pointer; }
`;

class ProjectStateEnhance implements IEnhanceModule {
    public readonly id = 'project-state';
    public readonly title = '项目状态生命周期增强';
    public readonly description = '为项目表格动态注入生命周期状态指示器及全局筛选面板。';
    public readonly defaultEnabled = true;
    public readonly settingsKey = 'enableProjectState';

    public readonly component = ProjectFilterPanel;

    private ctx!: ModuleContext;
    private isCrawlerReady: boolean = false;

    private matchMap = new Map<string, string>();
    private uniqueStates = new Set<string>();
    private totalStatesCount: number = 0;

    private scanTimer: number | null = null;
    private observerDisconnect: (() => void) | null = null;
    private routeChangeUnregister: (() => void) | null = null;
    private watchStopHandle: WatchStopHandle | null = null;

    private readonly STYLE_TAG_ID = 'hhjg-state-enhance-styles';
    public readonly styleIds = [this.STYLE_TAG_ID];

    private dictPromise: Promise<void> | null = null;

    private readonly BLACKLIST_ROUTES = ['/project/plm/projectmanagement','/produce/raw/add','/produce/plm/barcode-manager/'];

    /** 执行「完工类状态默认不激活」的路由名单（子串匹配），名单外路由默认激活全部状态字块 */
    private readonly DEFAULT_EXCLUDED_ROUTES = ['/produce/pro/project-inventory'];

    /** 仅名单路由生效的默认不激活状态 */
    private readonly DEFAULT_EXCLUDED_STATES = ['完工未验收', '完工已验收'];

    private readonly LOGICAL_ORDER = [
        '投标', '中标未开工', '中标停工', '局部开工', '全面开工',
        '临时停工', '收尾', '完工未验收', '完工已验收'
    ];

    private readonly STATE_COLORS: Record<string, string> = {
        '投标': '#409eff',
        '中标未开工': '#f56c6c',
        '中标停工': '#f56c6c',
        '临时停工': '#f56c6c',
        '局部开工': '#e6a23c',
        '全面开工': '#e6a23c',
        '收尾': '#e6a23c',
        '完工未验收': '#67c23a',
        '完工已验收': '#67c23a'
    };

    public init(ctx: ModuleContext): void {
        this.ctx = ctx;
        ctx.dom.injectStyle(this.STYLE_TAG_ID, STATE_ENHANCE_STYLES);

        this.watchStopHandle = watch(
            () => projectStateStore.activeStates.size,
            () => this.debounceScan()
        );

        // 路由变化：关闭悬浮窗并清空字块，交由后续 DOM 扫描按新路由重建（重新应用名单排除策略）
        this.routeChangeUnregister = ctx.dom.onRouteChange(() => {
            projectStateStore.isVisible = false;
            projectStateStore.states = [];
        });

        // 提前注册全局 DOM 观察：页面加载即开始扫描（字典就绪前无匹配，就绪后主动补扫）
        this.activateGlobalObserver();

        this.dictPromise = systemService.ping().then(res => {
            this.isCrawlerReady = !!res;
            return projectService.fetchProjectEntities(this.isCrawlerReady);
        }).then(plmJson => {
            this.buildDictionary(plmJson);
            this.debounceScan();
        }).catch(e => {
            console.warn('[ProjectStateEnhance] 全局字典预热失败', e);
        });
    }

    public destroy(): void {
        this.cleanupAll();

        this.observerDisconnect?.();
        this.observerDisconnect = null;

        this.routeChangeUnregister?.();
        this.routeChangeUnregister = null;

        if (this.watchStopHandle) {
            this.watchStopHandle();
            this.watchStopHandle = null;
        }

        this.dictPromise = null;
        projectStateStore.isVisible = false;
    }

    private buildDictionary(plmJson: any): void {
        if (!plmJson) return;

        let items = [];
        if (this.isCrawlerReady) {
            items = plmJson.Data?.Data || plmJson.Data || plmJson || [];
        } else {
            // 新字典接口 GetDictionaryDetailListByCode 返回 { Data: [...] }，Data 直接是对象数组
            items = plmJson.Data || [];
        }

        this.matchMap.clear();
        this.uniqueStates.clear();

        items.forEach((item: any) => {
            // 新字典接口状态字段为 Display_Name；本地爬虫源仍为 State_Name，双源兼容兜底
            const state = item.Display_Name || item.State_Name || '未知';
            if (String(state) === '0') return;

            const keyCandidates = [item.Name, item.Project_Name, item.Short_Name, state].filter(Boolean);

            keyCandidates.forEach(keyText => {
                this.matchMap.set(String(keyText).trim(), state);
            });

            if (state) this.uniqueStates.add(state);
        });
    }

    private getBadgeColor(state: string): string {
        return this.STATE_COLORS[state] || '#409eff';
    }

    private checkBlacklistMatch(): boolean {
        return this.ctx.dom.isUrlMatch(this.BLACKLIST_ROUTES);
    }

    private cleanupAll(): void {
        projectStateStore.isVisible = false;

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
     * @method shouldApplyDefaultExclusion
     * @description 判定当前路由是否命中 DEFAULT_EXCLUDED_ROUTES 名单，决定是否执行「完工类状态默认不激活」。
     * @returns {boolean} 命中名单则应用默认排除
     */
    private shouldApplyDefaultExclusion(): boolean {
        return this.ctx.dom.isUrlMatch(this.DEFAULT_EXCLUDED_ROUTES);
    }

    private populateFilterStates(viewStates?: Set<string>): void {
        const statesToRender = (viewStates && viewStates.size > 0) ? viewStates : this.uniqueStates;
        this.totalStatesCount = statesToRender.size;

        const excludedStates = this.shouldApplyDefaultExclusion()
            ? new Set(this.DEFAULT_EXCLUDED_STATES)
            : new Set<string>();

        projectStateStore.activeStates.clear();
        Array.from(statesToRender).forEach(state => {
            if (!excludedStates.has(state)) projectStateStore.activeStates.add(state);
        });

        projectStateStore.states = Array.from(statesToRender).sort((a, b) => {
            const indexA = this.LOGICAL_ORDER.indexOf(a);
            const indexB = this.LOGICAL_ORDER.indexOf(b);
            const weightA = indexA === -1 ? 999 : indexA;
            const weightB = indexB === -1 ? 999 : indexB;
            return weightA - weightB;
        }).map(state => ({
            name: state,
            color: this.getBadgeColor(state)
        }));

        if (projectStateStore.states.length > 0) {
            projectStateStore.isVisible = true;
        }
    }

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

    private debounceScan(): void {
        if (this.scanTimer) clearTimeout(this.scanTimer);
        this.scanTimer = window.setTimeout(() => {
            this.scanAndApply();
        }, 150);
    }

    private scanAndApply(): void {
        if (this.checkBlacklistMatch()) {
            this.cleanupAll();
            return;
        }

        const allTrs = this.ctx.dom.querySelectorAll<HTMLElement>(ProjectListHost.ROW_SELECTOR);
        const vxeRowMap = new Map<string, string>();
        const domStates = new Set<string>();

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
                    domStates.add(matchedState);
                    break;
                }
            }

            return { tr, rowid, matchedState, targetElement };
        });

        if (domStates.size > 0 && (!projectStateStore.isVisible || projectStateStore.states.length === 0)) {
            this.populateFilterStates(domStates);
        } else if (domStates.size === 0 && projectStateStore.states.length === 0) {
            projectStateStore.isVisible = false;
        }

        const isFilterContext = projectStateStore.isVisible;

        parsedRows.forEach(meta => {
            let finalState = meta.matchedState;
            if (!finalState && meta.rowid && vxeRowMap.has(meta.rowid)) {
                finalState = vxeRowMap.get(meta.rowid)!;
            }

            const { tr, targetElement } = meta;

            if (finalState) {
                if (isFilterContext) {
                    tr.style.display = projectStateStore.activeStates.has(finalState) ? '' : 'none';
                } else {
                    tr.style.display = '';
                }

                this.ctx.dom.addClass(tr, 'hhjg-state-row-enhanced');

                if (targetElement) {
                    this.ctx.dom.addClass(targetElement, 'hhjg-state-cell-enhanced');
                    this.ctx.dom.upsertIndicator(
                        targetElement,
                        this.getBadgeColor(finalState),
                        (e) => {
                            // 拦截冒泡防止触发行选中，仅向全局弹窗发出弹出请求
                            e.stopPropagation();
                            projectStateStore.requestPanel();
                        }
                    );
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

    private updateFooter(forceReset: boolean = false): void {
        const isAllActive = forceReset || (projectStateStore.activeStates.size === this.totalStatesCount);
        this.ctx.dom.recomputeVxeFooterTotals(isAllActive);
    }
}

export const projectStateEnhance = new ProjectStateEnhance();
