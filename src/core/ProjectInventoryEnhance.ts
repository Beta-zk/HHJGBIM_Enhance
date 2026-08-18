import { API_URLS } from '../config/constants';
import { projectService } from '../services/ProjectService'; 
import { systemService } from '../services/SystemService';
import { BimProjectItem, PlmEntityItem } from '../types';
import { NetworkHook } from './NetworkHook';
import { waitForElement } from '../utils/helpers';

/**
 * @class ProjectInventoryEnhance
 * @description 业务数据重组中间件。结合网络挂钩的前置依赖处理特性，基于预热探活标识决定分支走向，并附带 DOM 视图层的交互增强。
 */
export class ProjectInventoryEnhance {
    private isCrawlerReady: boolean = false;

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

            const uniqueStates = new Set<string>();

            warehouseItems.forEach(item => {
                if (item?.Project_Name) {
                    if (stateMap.has(item.Project_Name)) {
                        item.State_Name = stateMap.get(item.Project_Name)!;
                    } else {
                        if (!item.State_Name || String(item.State_Name) === '0') {
                            item.State_Name = '未知';
                        }
                    }
                }
                
                // 采集清洗后的最终状态
                if (item.State_Name) {
                    uniqueStates.add(item.State_Name);
                }
            });

            // 异步触发 UI 注入管线，脱离主解析线程防止阻塞网络返回
            if (uniqueStates.size > 0) {
                setTimeout(() => {
                    this.injectUIAndFilter(Array.from(uniqueStates));
                }, 100);
            }

            return warehouseJson;
        } catch (error) {
            console.error('[Middleware] 实体映射发生异常', error);
            return warehouseJson;
        }
    }

    /**
     * @private
     * @method injectUIAndFilter
     * @description 执行前端界面的增强注入。将状态筛选块单列一行并居中挂载，具备完善的多状态自动换行能力。
     * @param {string[]} states 数据源中提取的全局不重复状态集
     */
    private injectUIAndFilter(states: string[]): void {
        waitForElement('.el-form.el-form--inline').then(formEl => {
            
            // 清理历史版本中为了挤压空间而注入的强制内联约束，将宿主表单原样归还
            formEl.style.display = '';
            formEl.style.flexWrap = '';
            formEl.style.alignItems = '';
            formEl.style.width = '';
            formEl.style.whiteSpace = '';
            formEl.style.overflowX = '';

            // 清理历史版本注入的紧凑型穿透样式表（确保存量环境升级后的纯净性）
            formEl.classList.remove('hhjg-compact-form');
            const oldStyle = document.getElementById('hhjg-compact-form-style');
            if (oldStyle) {
                oldStyle.remove();
            }

            const CONTAINER_ID = 'hhjg-state-filter-container';
            if (document.getElementById(CONTAINER_ID)) return;

            const container = document.createElement('div');
            container.id = CONTAINER_ID;
            // 独立块级弹性布局：居中对齐、允许换行以适应未来扩展，并补充合理的下边距隔离表格
            container.style.cssText = 'display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; width: 100%;';

            const activeStates = new Set<string>(states);

            const enforceFilter = () => {
                const tbody = document.querySelector('.cs-main .vxe-table--render-wrapper .vxe-table--body-wrapper table tbody');
                if (!tbody) return;
                
                const trs = tbody.querySelectorAll('tr');
                trs.forEach(tr => {
                    const tds = tr.querySelectorAll('td');
                    // 确保存在至少3个 td（索引0, 1, 2）
                    if (tds.length >= 3) {
                        const stateText = tds[2].textContent?.trim() || '';
                        if (activeStates.has(stateText)) {
                            (tr as HTMLElement).style.display = '';
                        } else {
                            (tr as HTMLElement).style.display = 'none';
                        }
                    }
                });
            };

            states.forEach(state => {
                const btn = document.createElement('div');
                btn.textContent = state;
                // 维持微型高度与字号，略微恢复横向 Padding 至 8px，保障换行排列时的视觉平衡
                btn.style.cssText = `
                    padding: 0 8px;
                    height: 28px;
                    line-height: 26px;
                    border: 1px solid #409eff;
                    border-radius: 4px;
                    cursor: pointer;
                    user-select: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background-color: #409eff;
                    color: white;
                    font-size: 11px;
                    box-sizing: border-box;
                    white-space: nowrap;
                `;
                
                btn.onclick = () => {
                    if (activeStates.has(state)) {
                        activeStates.delete(state);
                        btn.style.backgroundColor = 'transparent';
                        btn.style.color = '#409eff';
                    } else {
                        activeStates.add(state);
                        btn.style.backgroundColor = '#409eff';
                        btn.style.color = 'white';
                    }
                    enforceFilter();
                };
                container.appendChild(btn);
            });

            // 越级挂载：不再塞入原生表单内部，而是作为独立组件追加到表单DOM节点的正后方
            formEl.insertAdjacentElement('afterend', container);

            // 部署表格渲染守卫，抵御 vxe-table 内部滚动/重绘导致的 DOM 刷新
            waitForElement('.cs-main .vxe-table--render-wrapper .vxe-table--body-wrapper table tbody').then(tbody => {
                enforceFilter(); // 初始执行
                const observer = new MutationObserver(() => {
                    // 暂停观察以避免无限循环，执行过滤后再恢复
                    observer.disconnect();
                    enforceFilter();
                    observer.observe(tbody, { childList: true, subtree: true });
                });
                observer.observe(tbody, { childList: true, subtree: true });
                console.log('[UI] 状态筛选面板及表格渲染守卫挂载完毕');
            });

        }).catch(e => {
            console.warn('[UI] 状态筛选面板挂载超时或未找到定位锚点', e);
        });
    }

    /**
     * @method init
     * @description 初始化清洗管线。发起非阻塞探活，消除拦截器的等待时延。
     */
    public init(): void {
        // 异步预热健康状态，不挂起主线程
        systemService.ping().then(res => {
            this.isCrawlerReady = !!res;
        }).catch(() => {
            this.isCrawlerReady = false;
        });

        NetworkHook.getInstance().registerResponseInterceptor({
            id: 'INTERCEPTOR_WAREHOUSE_STATS',
            urlMatcher: (url: string) => {
                try {
                    const requestUrl = new URL(url, window.location.origin);
                    const targetUrl = new URL(API_URLS.WAREHOUSE_DATA_STATS);
                    return requestUrl.pathname === targetUrl.pathname;
                } catch (error) {
                    return false; 
                }
            },
            // 利用缓存的就绪态，以 0ms 损耗进行降级路由分发
            beforeRequest: () => projectService.fetchProjectEntities(this.isCrawlerReady),
            handler: (originalJson: any, prefetchData: any) => {
                return this.injectTargetData(originalJson, prefetchData);
            }
        });
    }
}
