/**
 * @function showToast
 * @description 游离于框架体系之外的原生级视图反馈渲染器。利用微任务（Microtask）与动画帧进行高优先级样式构建。
 * @param {string} msg 广播载荷
 * @param {boolean} [isSuccess=true] 状态位判决
 * @returns {void}
 */
export function showToast(msg: string, isSuccess: boolean = true): void {
    const toast = document.createElement('div');
    
    const successIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    const errorIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    const bgColor = isSuccess ? 'rgba(16, 185, 129, 0.92)' : 'rgba(239, 68, 68, 0.92)';
    const shadowColor = isSuccess ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';

    toast.style.cssText = `
        position: fixed; bottom: 28px; right: 28px;
        display: flex; align-items: center; gap: 10px;
        background: ${bgColor}; color: #ffffff;
        padding: 12px 20px; border-radius: 12px;
        font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 10px 25px -5px ${shadowColor}, 0 8px 10px -6px rgba(0,0,0,0.1);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        z-index: 2147483647; pointer-events: none;
        opacity: 0; transform: translateY(16px) scale(0.95);
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const iconSpan = document.createElement('span');
    iconSpan.style.display = 'flex';
    iconSpan.innerHTML = isSuccess ? successIcon : errorIcon;

    const textSpan = document.createElement('span');
    textSpan.textContent = msg;

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);

    const attemptAppend = () => {
        if (document.body) {
            document.body.appendChild(toast);
            
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0) scale(1)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px) scale(0.98)';
                setTimeout(() => toast.remove(), 350);
            }, 3000);
        } else {
            setTimeout(attemptAppend, 50);
        }
    };
    attemptAppend();
}
