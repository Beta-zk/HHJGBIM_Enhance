import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { systemService } from '../services/SystemService';
import { NetworkHook } from './NetworkHook';
import { waitForElement } from '../utils/helpers';

/**
 * @class ProjectStateEnhance
 * @description 业务数据重组与视图增强中间件。支持状态生命周期逻辑排序、语义化区块色系、状态重算、以及基于路由名单的悬浮式筛选视图。
 */
export class ProjectStateEnhance {
    private isCrawlerReady: boolean = false;
    
    private matchMap = new Map<string, string>();
    private uniqueStates = new Set<string>();
    private activeStates = new Set<string>();
    private totalStatesCount: number = 0;
    
    private scanTimer: number | null = null;
    private isInjectingUI: boolean = false;
    private readonly FILTER_CONTAINER_ID = 'hhjg-state-filter-container';
    private readonly STYLE_TAG_ID = 'hhjg-state-enhance-styles';
    
    private dictPromise: Promise<void> | null = null;
    
    private dragMoveHandler: ((e: MouseEvent) => void) | null = null;
    private dragUpHandler: (() => void) | null = null;
    
    // 黑名单路由：一旦命中，强制卸载所有UI注入与监听挂载
    private readonly BLACKLIST_ROUTES = ['/project/plm/projectmanagement'];

    // 白名单路由：仅在命中以下关键字的 URL 时，才允许挂载可移动状态悬浮窗
    private readonly WHITELIST_ROUTES = [
        '/produce/pro/project-inventory' // 拓宽：匹配原材料仓等库存汇总页
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
            API_URLS.WAREHOUSE_DATA_STATS,
            API_URLS.GET_RAW_WH_SUMMARY_LIST
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
                        if (this.checkWhitelistMatch()) {
                            this.injectFilterUI(originalJson);
                        }
                    });
                }
                return originalJson; 
            }
        });
    }

    private injectGlobalStyles(): void {
        if (document.getElementById(this.STYLE_TAG_ID)) return;
        const style = document.createElement('style');
        style.id = this.STYLE_TAG_ID;
        style.type = 'text/css';
        // 样式硬编码化：字块直接钉死在 80px 宽，取消一切自适应拉伸逻辑
        style.innerHTML = `
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

    private checkBlacklistMatch(): boolean {
        const currentUrl = window.location.href.toLowerCase();
        return this.BLACKLIST_ROUTES.some(route => currentUrl.includes(route.toLowerCase()));
    }

    private checkWhitelistMatch(): boolean {
        const currentUrl = window.location.href.toLowerCase();
        return this.WHITELIST_ROUTES.some(route => currentUrl.includes(route.toLowerCase()));
    }

    private cleanupAll(): void {
        const container = document.getElementById(this.FILTER_CONTAINER_ID);
        if (container) container.remove();
        
        if (this.dragMoveHandler) {
            document.removeEventListener('mousemove', this.dragMoveHandler);
            this.dragMoveHandler = null;
        }
        if (this.dragUpHandler) {
            document.removeEventListener('mouseup', this.dragUpHandler);
            this.dragUpHandler = null;
        }

        document.querySelectorAll('.hhjg-state-row-enhanced').forEach(el => {
            el.classList.remove('hhjg-state-row-enhanced');
            (el as HTMLElement).style.display = ''; 
        });

        document.querySelectorAll('.hhjg-state-cell-enhanced').forEach(el => {
            el.classList.remove('hhjg-state-cell-enhanced');
        });

        document.querySelectorAll('.hhjg-state-indicator').forEach(indicator => indicator.remove());
    }

    private injectFilterUI(originalJson?: any): void {
        if (!this.checkWhitelistMatch() || document.getElementById(this.FILTER_CONTAINER_ID)) {
            return;
        }

        waitForElement('.cs-z-page-main-content').then(wrapperEl => {
            if (document.getElementById(this.FILTER_CONTAINER_ID)) return;

            const computedStyle = window.getComputedStyle(wrapperEl);
            if (computedStyle.position === 'static') {
                wrapperEl.style.position = 'relative';
            }

            const container = document.createElement('div');
            container.id = this.FILTER_CONTAINER_ID;
            container.title = "按住背景可拖动面板";
            
            // 设定面板固定尺寸 280px，并采用普通灰色半透明背景（无磨砂）
            container.style.cssText = `
                position: absolute;
                top: 12px;
                left: 12px;
                z-index: 999999;
                background-color: rgba(210, 215, 220, 0.7);
                border: 1px solid rgba(0, 0, 0, 0.15);
                border-radius: 6px;
                padding: 10px;
                display: flex;
                flex-wrap: wrap;
                align-content: flex-start;
                gap: 6px;
                width: 280px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                cursor: move;
                user-select: none;
            `;

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

            sortedStates.forEach(state => {
                const btn = document.createElement('div');
                btn.textContent = state;
                btn.className = 'hhjg-state-btn';
                
                const themeColor = this.getBadgeColor(state);
                btn.style.borderColor = themeColor;
                
                const updateBtnStyle = (isActive: boolean) => {
                    if (isActive) {
                        btn.style.backgroundColor = themeColor;
                        btn.style.color = 'white';
                    } else {
                        btn.style.backgroundColor = 'transparent';
                        btn.style.color = themeColor;
                    }
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

            wrapperEl.appendChild(container);

            let isDragging = false;
            let startX = 0, startY = 0;
            let initLeft = 12, initTop = 12;

            container.addEventListener('mousedown', (e) => {
                if ((e.target as HTMLElement).classList.contains('hhjg-state-btn')) return;
                
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                initLeft = parseInt(container.style.left || '12', 10);
                initTop = parseInt(container.style.top || '12', 10);
                e.preventDefault(); 
            });

            this.dragMoveHandler = (e: MouseEvent) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                const wrapperRect = wrapperEl.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                let targetLeft = initLeft + dx;
                let targetTop = initTop + dy;
                
                const maxLeft = wrapperRect.width - containerRect.width;
                const maxTop = wrapperRect.height - containerRect.height;
                
                targetLeft = Math.max(0, Math.min(targetLeft, maxLeft));
                targetTop = Math.max(0, Math.min(targetTop, maxTop));
                
                container.style.left = `${targetLeft}px`;
                container.style.top = `${targetTop}px`;
            };

            this.dragUpHandler = () => {
                if (isDragging) {
                    isDragging = false;
                }
            };

            document.addEventListener('mousemove', this.dragMoveHandler);
            document.addEventListener('mouseup', this.dragUpHandler);

            this.debounceScan();
        }).catch(e => {
            console.warn('[UI] 悬浮面板未找到定位锚点', e);
        });
    }

    private activateGlobalObserver(): void {
        const observer = new MutationObserver((mutations) => {
            const isOnlyIndicatorMutations = Array.from(mutations).every(m => {
                if (m.type !== 'childList') return false;
                
                const checkNodes = (nodes: NodeList) => Array.from(nodes).every(
                    n => n.nodeType === 1 && (n as HTMLElement).classList.contains('hhjg-state-indicator')
                );
                
                return checkNodes(m.addedNodes) && checkNodes(m.removedNodes);
            });

            if (isOnlyIndicatorMutations) return;
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

    private scanAndApply(): void {
        if (this.checkBlacklistMatch()) {
            this.cleanupAll();
            return;
        }

        const isWhitelist = this.checkWhitelistMatch();
        const isFilterActive = !!document.getElementById(this.FILTER_CONTAINER_ID);

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

        const allTrs = Array.from(document.querySelectorAll('table tbody tr'));
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

            const cells = tr.querySelectorAll('td .cell, td > div, td .vxe-cell');
            for (let i = 0; i < cells.length; i++) {
                const el = cells[i] as HTMLElement;
                const clone = el.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('.hhjg-state-indicator').forEach(b => b.remove());
                
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

        const isFilterContext = isWhitelist && !!document.getElementById(this.FILTER_CONTAINER_ID);

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

                tr.classList.add('hhjg-state-row-enhanced');

                if (targetElement) {
                    targetElement.classList.add('hhjg-state-cell-enhanced');
                    let indicator = targetElement.querySelector(':scope > .hhjg-state-indicator') as HTMLElement;
                    const themeColor = this.getBadgeColor(finalState);

                    if (!indicator) {
                        indicator = document.createElement('span');
                        indicator.className = 'hhjg-state-indicator';
                        indicator.style.backgroundColor = themeColor;
                        targetElement.appendChild(indicator);
                    } else if (indicator.style.backgroundColor !== themeColor) {
                        indicator.style.backgroundColor = themeColor;
                    }
                }
            } else {
                tr.classList.remove('hhjg-state-row-enhanced');
                tr.style.display = ''; 
                tr.querySelectorAll('.hhjg-state-cell-enhanced').forEach(el => {
                    el.classList.remove('hhjg-state-cell-enhanced');
                    el.querySelector(':scope > .hhjg-state-indicator')?.remove();
                });
            }
        });

        this.updateFooter(!isFilterContext);
    }

    private updateFooter(forceReset: boolean = false): void {
        const isAllActive = forceReset || (this.activeStates.size === this.totalStatesCount);
        const vxeTables = document.querySelectorAll('.vxe-table');
        
        vxeTables.forEach(vxeContainer => {
            const tbody = vxeContainer.querySelector('.vxe-table--body tbody');
            const tfoot = vxeContainer.querySelector('.vxe-table--footer tfoot');
            
            if (!tbody || !tfoot) return;
            
            const visibleRows = Array.from(tbody.querySelectorAll<HTMLElement>('tr')).filter(tr => tr.style.display !== 'none');
            const tfootRows = Array.from(tfoot.querySelectorAll<HTMLElement>('tr'));
            
            tfootRows.forEach(tRow => {
                const fCells = Array.from(tRow.querySelectorAll<HTMLElement>('th, td'));
                
                fCells.forEach((fCell, colIndex) => {
                    let innerTarget = fCell.querySelector('.vxe-cell--item') as HTMLElement;
                    if (!innerTarget) innerTarget = fCell.querySelector('.vxe-cell') as HTMLElement;
                    if (!innerTarget) innerTarget = fCell;
                    
                    if (!innerTarget.hasAttribute('data-orig-text')) {
                        innerTarget.setAttribute('data-orig-text', innerTarget.textContent?.trim() || '');
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
                            if (!isNaN(val)) {
                                sum += val;
                            }
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
}
