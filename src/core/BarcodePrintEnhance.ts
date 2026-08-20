import { NetworkHook } from './NetworkHook';
import { schdulingService } from '../services/SchdulingService';
import { domMaster } from './DomMaster';
import { showToast } from '../utils/helpers';

/**
 * @class BarcodePrintEnhance
 * @description 条码打印增强引擎。监听条码读取配置接口，在打印页注入排产单号查询控件，
 * 检索构件条码后自动级联选中所属项目并触发查询。页面控件构建与交互委托给 DomMaster，本类仅保留查询流程编排与级联时序。
 */
export class BarcodePrintEnhance {
    
    /**
     * @method init
     * @description 注入打印页表格高度修正样式，并向网络劫持总线注册条码读取接口的响应拦截器。
     */
    public init(): void {
        this.applyTemporaryUiFix();

        NetworkHook.getInstance().registerResponseInterceptor({
            id: 'INTERCEPTOR_BARCODE_PRINT',
            urlMatcher: (url: string) => url.includes('/PRO/PrintTemplate/GetPageSettingBarcodeRead'),
            handler: (originalJson: any) => {
                this.injectDomInteraction();
                return originalJson;
            }
        });
    }

    /**
     * @method applyTemporaryUiFix
     * @description 注入临时样式，约束打印页表格容器最大高度，避免长列表撑破布局。
     */
    private applyTemporaryUiFix(): void {
        domMaster.injectStyle('temp-fix-table-wrapper-height', `
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
        domMaster.waitForElement('.el-textarea__inner')
            .then((targetElement) => {
                const targetTextarea = targetElement as HTMLTextAreaElement;
                const elTextarea = targetTextarea.closest('.el-textarea');

                if (elTextarea && elTextarea.parentElement) {
                    if (!elTextarea.parentElement.querySelector('.hhjg-barcode-wrapper')) {
                        elTextarea.parentElement.style.display = 'flex';
                        elTextarea.parentElement.style.alignItems = 'flex-start';

                        const wrapper = domMaster.createElement('div', {
                            className: 'hhjg-barcode-wrapper',
                            styles: {
                                display: 'flex',
                                alignItems: 'flex-start',
                                marginLeft: '20px',
                                gap: '10px'
                            }
                        });

                        const input = domMaster.createElement('input', {
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

                        const btn = domMaster.createElement('button', {
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
                                    domMaster.setValueAndNotify(targetTextarea, compCodes.join('\n'));
                                    
                                    showToast(`检索完毕，共装载 ${compCodes.length} 项构件条码，正在自动校验联动环境...`, true);

                                    setTimeout(() => {
                                        if (projectName) {
                                            const targetSpan = domMaster.findElementByText('.el-select-dropdown__item span', projectName);

                                            if (targetSpan) {
                                                const parentLi = targetSpan.closest('.el-select-dropdown__item') as HTMLElement;
                                                if (parentLi) parentLi.click();
                                                else targetSpan.click();
                                            } else {
                                                console.warn(`[UI] 节点遍历阻断：未能寻址到隶属 "${projectName}" 的节点`);
                                            }
                                        }

                                        setTimeout(() => {
                                            const searchBtn = domMaster.findElementByText('.filters button', '查询') as HTMLButtonElement | null;
                                            
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
