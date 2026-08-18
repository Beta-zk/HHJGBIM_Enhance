import { NetworkHook } from './NetworkHook';
import { schdulingService } from '../services/SchdulingService';
import { showToast, waitForElement } from '../utils/helpers';

/**
 * @class BarcodePrintEnhance
 * @description 条码打印增强引擎。基于特定业务流接口的响应触发 DOM 轮询，无缝注入外部构件获取控件并实现检索与视图联动。
 */
export class BarcodePrintEnhance {
    
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

    private applyTemporaryUiFix(): void {
        const STYLE_ID = 'temp-fix-table-wrapper-height';
        if (document.getElementById(STYLE_ID)) return;

        const styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.type = 'text/css';
        styleElement.innerHTML = `
            .table-main .dynamic-table .t-wrapper {
                max-height: 400px !important;
            }
        `;
        (document.head || document.documentElement).appendChild(styleElement);
    }

    private injectDomInteraction(): void {
        waitForElement('.el-textarea__inner')
            .then((targetElement) => {
                const targetTextarea = targetElement as HTMLTextAreaElement;
                const elTextarea = targetTextarea.closest('.el-textarea');

                if (elTextarea && elTextarea.parentElement) {
                    if (!elTextarea.parentElement.querySelector('.hhjg-barcode-wrapper')) {
                        elTextarea.parentElement.style.display = 'flex';
                        elTextarea.parentElement.style.alignItems = 'flex-start';

                        const wrapper = document.createElement('div');
                        wrapper.className = 'hhjg-barcode-wrapper';
                        wrapper.style.cssText = 'display: flex; align-items: flex-start; margin-left: 20px; gap: 10px;';

                        const input = document.createElement('input');
                        input.type = 'text';
                        input.placeholder = '请输入排产单号...';
                        input.style.cssText = 'width: 150px; height: 32px; padding: 0 10px; border: 1px solid #dcdfe6; border-radius: 4px; outline: none; font-size: 14px; color: #606266;';

                        const btn = document.createElement('button');
                        btn.textContent = '查询所属构件';
                        btn.style.cssText = 'height: 32px; padding: 0 15px; background: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; font-size: 14px; transition: background-color 0.3s;';

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
                                    targetTextarea.value = compCodes.join('\n');
                                    targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                                    targetTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                                    
                                    showToast(`检索完毕，共装载 ${compCodes.length} 项构件条码，正在自动校验联动环境...`, true);

                                    setTimeout(() => {
                                        if (projectName) {
                                            const dropdownSpans = Array.from(document.querySelectorAll('.el-select-dropdown__item span'));
                                            const targetSpan = dropdownSpans.find(span => span.textContent && span.textContent.includes(projectName)) as HTMLElement;

                                            if (targetSpan) {
                                                const parentLi = targetSpan.closest('.el-select-dropdown__item') as HTMLElement;
                                                if (parentLi) parentLi.click();
                                                else targetSpan.click();
                                                console.log(`[UI] 自动化级联触发：成功映射并锁定宿主项目域 [${projectName}]`);
                                            } else {
                                                console.warn(`[UI] 节点遍历阻断：未能寻址到隶属 "${projectName}" 的节点`);
                                            }
                                        }

                                        setTimeout(() => {
                                            const buttons = Array.from(document.querySelectorAll('.filters button'));
                                            const searchBtn = buttons.find(b => b.textContent && b.textContent.includes('查询')) as HTMLButtonElement;
                                            
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
