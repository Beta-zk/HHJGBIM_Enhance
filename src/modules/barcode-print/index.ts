import { schdulingService } from '../../services/SchdulingService';
import { BarcodePrintHost } from '../../host/barcodePrint';
import { showToast } from '../../utils/helpers';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';

/**
 * @class BarcodePrintEnhance
 * @description 条码打印增强模块。监听条码读取配置接口，在打印页注入排产单号查询控件，
 * 检索构件条码后自动级联选中所属项目并触发查询。页面控件构建与交互经 ModuleContext.dom 委托
 * DomMaster，本类仅保留查询流程编排与级联时序。
 */
class BarcodePrintEnhance implements IEnhanceModule {
    public readonly id = 'barcode-print';
    public readonly title = '条码打印联动增强';
    public readonly description = '在条码打印页通过排产单号快捷查询构件条码，并自动级联选中所属项目执行查询。';
    public readonly defaultEnabled = true;
    public readonly settingsKey = 'enableBarcodePrintEnhance';
    public readonly styleIds = ['temp-fix-table-wrapper-height'];

    public readonly interceptors = [{
        id: 'INTERCEPTOR_BARCODE_PRINT',
        urlMatcher: '/PRO/PrintTemplate/GetPageSettingBarcodeRead',
        onResponse: () => {
            this.injectDomInteraction();
        }
    }];

    private ctx!: ModuleContext;

    /**
     * @method init
     * @description 注入打印页表格高度修正样式。拦截器由 EnhanceManager 按声明注册。
     * @param {ModuleContext} ctx 模块运行上下文
     */
    public init(ctx: ModuleContext): void {
        this.ctx = ctx;
        ctx.dom.injectStyle('temp-fix-table-wrapper-height', `
            .table-main .dynamic-table .t-wrapper {
                max-height: 400px !important;
            }
        `);
    }

    /**
     * @method injectDomInteraction
     * @description 在条码打印页的排产单输入区旁注入「排产单号 + 查询按钮」控件组（幂等），
     * 点击后调用排产服务获取构件条码并回填文本框，随后级联选中所属项目并自动触发查询。
     */
    private injectDomInteraction(): void {
        BarcodePrintHost.getTextarea()
            .then((targetElement) => {
                const elTextarea = targetElement.closest(BarcodePrintHost.TEXTAREA_WRAPPER_SELECTOR);

                if (elTextarea && elTextarea.parentElement) {
                    if (!elTextarea.parentElement.querySelector(`.${BarcodePrintHost.WRAPPER_CLASS}`)) {
                        elTextarea.parentElement.style.display = 'flex';
                        elTextarea.parentElement.style.alignItems = 'flex-start';

                        const wrapper = this.ctx.dom.createElement('div', {
                            className: BarcodePrintHost.WRAPPER_CLASS,
                            styles: {
                                display: 'flex',
                                alignItems: 'flex-start',
                                marginLeft: '20px',
                                gap: '10px'
                            }
                        });

                        const input = this.ctx.dom.createElement('input', {
                            attributes: {
                                type: 'text',
                                placeholder: '请输入排产单号...'
                            },
                            styles: {
                                width: '150px',
                                height: '32px',
                                padding: '0 10px',
                                border: '1px solid #dcdfe6',
                                borderRadius: '4px',
                                outline: 'none',
                                fontSize: '14px',
                                color: '#606266'
                            }
                        });

                        const btn = this.ctx.dom.createElement('button', {
                            text: '查询所属构件',
                            styles: {
                                height: '32px',
                                padding: '0 15px',
                                background: '#409eff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                fontSize: '14px',
                                transition: 'background-color 0.3s'
                            }
                        });

                        btn.onmouseover = () => { if (!btn.disabled) btn.style.background = '#66b1ff'; };
                        btn.onmouseout = () => { if (!btn.disabled) btn.style.background = '#409eff'; };

                        btn.onclick = async (e) => {
                            e.preventDefault();
                            const code = input.value.trim();
                            if (!code) {
                                showToast('排产单号不允许为空', false);
                                return;
                            }

                            try {
                                btn.textContent = '读取中...';
                                btn.disabled = true;
                                btn.style.cursor = 'not-allowed';
                                btn.style.opacity = '0.7';

                                const result = await schdulingService.getCompCodesBySchdulingCode(code);
                                const { compCodes, projectName } = result;
                                
                                if (!compCodes || compCodes.length === 0) {
                                    showToast('未查找到对应的构件矩阵数据', false);
                                } else {
                                    this.ctx.dom.setValueAndNotify(targetElement, compCodes.join('\n'));
                                    
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
                                            const searchBtn = this.ctx.dom.findElementByText(BarcodePrintHost.SEARCH_BUTTON_SELECTOR, '查询') as HTMLButtonElement | null;
                                            
                                            if (searchBtn) searchBtn.click();
                                            else console.warn('[UI] 联动事件异常熔断：终端 DOM 树中缺失关键“查询”交互节点');
                                        }, 300);
                                    }, 200);
                                }
                            } catch (error: any) {
                                showToast(error.message || '构件关联查询异常，请校验通讯链路或单据合法性', false);
                            } finally {
                                btn.textContent = '获取所属构件';
                                btn.disabled = false;
                                btn.style.cursor = 'pointer';
                                btn.style.opacity = '1';
                                btn.style.background = '#409eff';
                            }
                        };

                        wrapper.appendChild(input);
                        wrapper.appendChild(btn);
                        elTextarea.insertAdjacentElement('afterend', wrapper);
                        
                        console.log('[UI] 增强模块逻辑探针装载完毕');
                    }
                }
            })
            .catch(() => {
                console.warn('[UI] 探测任务超时：未能在存活周期内捕捉到合规的可挂载叶节点');
            });
    }
}

export const barcodePrintEnhance = new BarcodePrintEnhance();
