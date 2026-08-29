import { schdulingService } from '../../services/SchdulingService';
import { BarcodePrintHost } from '../../host/barcodePrint';
import { showToast } from '../../utils/helpers';
import type { IDraggablePanel } from '../../core/DomMaster';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';

/**
 * @class BarcodePrintEnhance
 * @description 条码打印增强模块。监听条码读取配置接口，在打印页的 filter-left 筛选区内注入
 * 排产单号查询控件（隐藏宿主原有名称输入区但保留 DOM，原查询逻辑仍依赖其值），检索构件条码后
 * 自动回填文本域、级联选中所属项目并触发查询，随后弹出可拖拽的构件清单悬浮框供核对。
 * 页面控件构建与交互经 ModuleContext.dom 委托 DomMaster，本类仅保留查询流程编排与级联时序。
 * 打印页表格滚动临时修复样式已迁出至独立插件 temp-fixes（宿主修复后可整体下线）。
 */
class BarcodePrintEnhance implements IEnhanceModule {
    public readonly id = 'barcode-print';
    public readonly title = '条码打印联动增强';
    public readonly description = '在条码打印页通过排产单号快捷查询构件条码，并自动级联选中所属项目执行查询，展示可核对构件清单。';
    public readonly defaultEnabled = true;
    public readonly settingsKey = 'enableBarcodePrintEnhance';

    public readonly interceptors = [{
        id: 'INTERCEPTOR_BARCODE_PRINT',
        urlMatcher: '/PRO/PrintTemplate/GetPageSettingBarcodeRead',
        onResponse: () => {
            this.injectDomInteraction();
        }
    }];

    private ctx!: ModuleContext;
    private resultPanel: IDraggablePanel | null = null;
    /** 被隐藏的宿主原表单项（destroy 时恢复） */
    private hiddenFormItems: HTMLElement[] = [];

    public init(ctx: ModuleContext): void {
        this.ctx = ctx;
    }

    /**
     * @method destroy
     * @description 模块卸载：销毁遗留悬浮面板，恢复被隐藏的宿主原表单项显示，移除注入的控件组。
     */
    public destroy(): void {
        this.resultPanel?.destroy();
        this.resultPanel = null;

        this.hiddenFormItems.forEach(el => { el.style.display = ''; });
        this.hiddenFormItems = [];

        this.ctx.dom.querySelectorAll<HTMLElement>(`.${BarcodePrintHost.WRAPPER_CLASS}`)
            .forEach(el => el.remove());
    }

    /**
     * @method injectDomInteraction
     * @description 在条码打印页 filter-left 内注入「排产单号 + 查询按钮」控件组（幂等）：
     * 隐藏宿主原有名称输入区（保留 DOM 供原查询链路取值与模拟点击），
     * 点击后调用排产服务获取构件条码回填文本域，级联选中所属项目并触发查询，
     * 最后弹出可拖拽的构件清单悬浮框。
     */
    private injectDomInteraction(): void {
        BarcodePrintHost.getFilterLeft()
            .then((filterLeft) => {
                // 幂等：直接子节点已存在本模块控件组则跳过
                if (filterLeft.querySelector(`:scope > .${BarcodePrintHost.WRAPPER_CLASS}`)) return;

                // 清理旧版残留控件组（宿主页面快照或旧版本脚本遗留），保证唯一注入
                filterLeft.querySelectorAll(`.${BarcodePrintHost.WRAPPER_CLASS}`)
                    .forEach(el => el.remove());

                // 隐藏宿主原有表单项（label + textarea），仅视觉隐藏，DOM 保留
                filterLeft.querySelectorAll<HTMLElement>(BarcodePrintHost.FILTER_LEFT_FORM_ITEM_SELECTOR)
                    .forEach(el => {
                        el.style.display = 'none';
                        this.hiddenFormItems.push(el);
                    });

                const textarea = filterLeft.querySelector<HTMLTextAreaElement>(BarcodePrintHost.TEXTAREA_SELECTOR);

                // 宿主 el-input 风格输入框（外层容器复用宿主类，保证 focus 态等样式一致）
                const inputWrapper = this.ctx.dom.createElement('div', {
                    className: 'el-input el-input--mini',
                    styles: {
                        width: '180px'
                    }
                });
                const input = this.ctx.dom.createElement('input', {
                    attributes: {
                        type: 'text',
                        placeholder: '请输入排产单号...',
                        class: 'el-input__inner'
                    },
                    styles: {
                        height: '28px'
                    }
                });
                inputWrapper.appendChild(input);

                // 宿主 el-button 风格按钮
                const btn = this.ctx.dom.createElement('button', {
                    text: '查询所属构件',
                    attributes: {
                        type: 'button',
                        class: 'el-button el-button--primary el-button--mini'
                    },
                    styles: {
                        padding: '0 15px',
                        height: '28px',
                        lineHeight: '26px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                    }
                });

                const wrapper = this.ctx.dom.createElement('div', {
                    className: BarcodePrintHost.WRAPPER_CLASS,
                    styles: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 0',
                        flexShrink: '0'
                    }
                });

                btn.onclick = async (e) => {
                    e.preventDefault();
                    const code = input.value.trim();
                    if (!code) {
                        showToast('排产单号不允许为空', false);
                        return;
                    }

                    try {
                        btn.textContent = '读取中...';
                        btn.classList.add('is-disabled');

                        const result = await schdulingService.getCompCodesBySchdulingCode(code);
                        const { compCodes, projectName } = result;

                        if (!compCodes || compCodes.length === 0) {
                            showToast('未查找到对应的构件矩阵数据', false);
                        } else {
                            if (textarea) {
                                this.ctx.dom.setValueAndNotify(textarea, compCodes.join('\n'));
                            }

                            showToast(`检索完毕，共装载 ${compCodes.length} 项构件条码，正在自动校验联动环境...`, true);

                            setTimeout(() => {
                                if (projectName) {
                                    const targetSpan = this.ctx.dom.findElementByText(BarcodePrintHost.PROJECT_DROPDOWN_ITEM_SELECTOR, projectName);

                                    if (targetSpan) {
                                        const parentLi = targetSpan.closest('.el-select-dropdown__item') as HTMLElement;
                                        if (parentLi) parentLi.click();
                                        else targetSpan.click();
                                    } else {
                                        console.warn(`[UI] 节点遍历阻断：未能寻址到隶属 "${projectName}" 的节点`);
                                    }
                                }

                                setTimeout(() => {
                                    // 精确匹配宿主「查询」按钮（文本 === '查询'），
                                    // 避免 includes 误命中本模块注入的「查询所属构件」按钮
                                    const searchBtn = this.findHostSearchButton();

                                    if (searchBtn) searchBtn.click();
                                    else console.warn('[UI] 联动事件异常熔断：终端 DOM 树中缺失关键“查询”交互节点');

                                    // 后续逻辑全部完成后，弹出构件清单悬浮框供核对
                                    // 数据源为 filter-left 中输入框（textarea）的实际内容
                                    const listContent = textarea
                                        ? textarea.value.split('\n')
                                        : compCodes;
                                    this.showResultPanel(listContent);
                                }, 300);
                            }, 200);
                        }
                    } catch (error: any) {
                        showToast(error.message || '构件关联查询异常，请校验通讯链路或单据合法性', false);
                    } finally {
                        btn.textContent = '查询所属构件';
                        btn.classList.remove('is-disabled');
                    }
                };

                wrapper.appendChild(inputWrapper);
                wrapper.appendChild(btn);
                filterLeft.appendChild(wrapper);

                console.log('[UI] 增强模块逻辑探针装载完毕');
            })
            .catch(() => {
                console.warn('[UI] 探测任务超时：未能在存活周期内捕捉到合规的可挂载叶节点');
            });
    }

    /**
     * @method findHostSearchButton
     * @description 精确查找宿主页面「查询」按钮：遍历全部主按钮，取清洗后文本与 SEARCH_BUTTON_TEXT
     * 严格相等的首个节点。规避 findElementByText 的 includes 语义误命中本模块注入的按钮。
     * @returns {HTMLButtonElement | null}
     */
    private findHostSearchButton(): HTMLButtonElement | null {
        const candidates = this.ctx.dom.querySelectorAll<HTMLButtonElement>(BarcodePrintHost.SEARCH_BUTTON_SELECTOR);
        return candidates.find(btn => (btn.textContent || '').replace(/\s+/g, '') === BarcodePrintHost.SEARCH_BUTTON_TEXT) ?? null;
    }

    /**
     * @method showResultPanel
     * @description 弹出可拖拽的构件清单悬浮框：固定宽高，头部可拖拽，列表区超出高度滚动，
     * 展示 filter-left 中输入框（textarea）的构件条码清单并统计数量。
     * @param {string[]} items 构件条码清单（来自宿主输入框内容）
     */
    private showResultPanel(items: string[]): void {
        this.resultPanel?.destroy();

        const listItems = items.filter(code => code.trim() !== '');
        const count = listItems.length;

        const panel = this.ctx.dom.createDraggablePanel({
            id: 'hhjg-barcode-result-panel',
            title: '构件清单',
            mountTarget: document.body,
            width: 380,
            top: 90,
            left: 40,
            style: {
                height: '420px',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                border: '1px solid #dcdfe6',
                borderRadius: '6px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                cursor: 'default',
                userSelect: 'text'
            },
            // 仅头部区域（不含关闭按钮）参与拖拽，列表区可滚动与选中文本
            isDraggableTarget: (e) => {
                const target = e.target as HTMLElement;
                return !!target.closest(`.${BarcodePrintHost.PANEL_HEADER_CLASS}`)
                    && !target.closest('.hhjg-barcode-panel-close');
            },
            onReady: (container) => {
                const header = this.ctx.dom.createElement('div', {
                    className: BarcodePrintHost.PANEL_HEADER_CLASS,
                    styles: {
                        flexShrink: '0',
                        height: '40px',
                        lineHeight: '40px',
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f5f7fa',
                        borderBottom: '1px solid #e4e7ed',
                        cursor: 'move',
                        userSelect: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#303133'
                    }
                });

                const title = this.ctx.dom.createElement('span', {
                    text: `构件清单（共 ${count} 条）`
                });

                const closeBtn = this.ctx.dom.createElement('button', {
                    text: '×',
                    className: 'hhjg-barcode-panel-close',
                    attributes: { type: 'button' },
                    styles: {
                        border: 'none',
                        background: 'transparent',
                        fontSize: '18px',
                        lineHeight: '1',
                        cursor: 'pointer',
                        color: '#909399',
                        padding: '0 4px'
                    }
                });
                closeBtn.onclick = () => panel.destroy();

                header.appendChild(title);
                header.appendChild(closeBtn);

                const body = this.ctx.dom.createElement('div', {
                    className: BarcodePrintHost.PANEL_BODY_CLASS,
                    styles: {
                        flex: '1',
                        overflowY: 'auto',
                        padding: '6px 0',
                        cursor: 'text'
                    }
                });

                if (count === 0) {
                    const empty = this.ctx.dom.createElement('div', {
                        text: '暂无构件数据',
                        styles: {
                            padding: '16px 12px',
                            color: '#909399',
                            fontSize: '13px',
                            textAlign: 'center'
                        }
                    });
                    body.appendChild(empty);
                } else {
                    listItems.forEach((code) => {
                        const row = this.ctx.dom.createElement('div', {
                            text: code,
                            styles: {
                                padding: '8px 12px',
                                fontSize: '13px',
                                color: '#606266',
                                borderBottom: '1px solid #f0f2f5',
                                wordBreak: 'break-all'
                            }
                        });
                        body.appendChild(row);
                    });
                }

                container.appendChild(header);
                container.appendChild(body);
            }
        });

        this.resultPanel = panel;
    }
}

export const barcodePrintEnhance = new BarcodePrintEnhance();
