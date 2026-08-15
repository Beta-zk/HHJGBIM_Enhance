import { NetworkHook } from './NetworkHook';
import { schdulingService } from '../services/SchdulingService';
import { showToast } from '../utils/helpers';

/**
 * @class BarcodePrintEnhance
 * @description 条码打印增强引擎。基于特定业务流接口的响应触发 DOM 轮询，无缝注入外部构件获取控件并实现检索联动。
 */
export class BarcodePrintEnhance {
    
    /**
     * @method init
     * @description 挂载拦截器，侦测条码模版数据读取行为。
     */
    public init(): void {
        NetworkHook.getInstance().registerResponseInterceptor({
            id: 'INTERCEPTOR_BARCODE_PRINT',
            urlMatcher: (url: string) => url.includes('/PRO/PrintTemplate/GetPageSettingBarcodeRead'),
            handler: (originalJson: any) => {
                this.injectDomInteraction();
                return originalJson;
            }
        });
    }

    private injectDomInteraction(): void {
        const MAX_ATTEMPTS = 20;
        const INTERVAL_MS = 500;
        let attempts = 0;

        const timer = setInterval(() => {
            attempts++;
            const textareas = document.querySelectorAll('.el-textarea__inner');

            if (textareas.length > 0) {
                const targetTextarea = textareas[0] as HTMLTextAreaElement;
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
                        input.style.cssText = 'width: 300px; height: 32px; padding: 0 10px; border: 1px solid #dcdfe6; border-radius: 4px; outline: none; font-size: 14px; color: #606266;';

                        const btn = document.createElement('button');
                        btn.textContent = '获取所属构件';
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

                                const compCodes = await schdulingService.getCompCodesBySchdulingCode(code);
                                
                                if (!compCodes || compCodes.length === 0) {
                                    showToast('未查找到对应的构件矩阵数据', false);
                                } else {
                                    targetTextarea.value = compCodes.join('\n');
                                    targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                                    targetTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                                    
                                    showToast(`检索完毕，共装载 ${compCodes.length} 项构件条码，正在自动查询...`, true);

                                    // 引入宏任务延迟，等待 Vue 响应式系统完成数据劫持与底层组件重绘
                                    setTimeout(() => {
                                        const buttons = Array.from(document.querySelectorAll('.filters button'));
                                        const searchBtn = buttons.find(b => b.textContent && b.textContent.includes('查询')) as HTMLButtonElement;
                                        
                                        if (searchBtn) {
                                            searchBtn.click();
                                        } else {
                                            console.warn('[UI] 自动查询联动失败：DOM 树中未寻址到“查询”触发节点');
                                        }
                                    }, 300);
                                }
                            } catch (error: any) {
                                showToast(error.message || '构件关联查询异常，请校验通讯链路或单号合法性', false);
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
                        
                        console.log('[UI] 条码打印增强控制点挂载完毕');
                    }
                }
                clearInterval(timer);
                return;
            }

            if (attempts >= MAX_ATTEMPTS) {
                clearInterval(timer);
                console.warn('[UI] 条码打印增强寻址超时，放弃注入');
            }
        }, INTERVAL_MS);
    }
}
