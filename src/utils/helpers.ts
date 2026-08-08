/**
 * @function showToast
 * @description 渲染全局状态提示吐司通知。
 * @param {string} msg 提示内容文本
 * @param {boolean} [isSuccess=true] 布尔值标识是否为成功状态（决定底色）
 * @returns {void}
 */
export function showToast(msg: string, isSuccess: boolean = true): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${isSuccess ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.95)'};
        color: #fff; z-index: 2147483647; padding: 12px 24px; border-radius: 8px;
        font-size: 14px; font-weight: bold; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s ease; pointer-events: none;
    `;
    toast.innerHTML = msg;

    const attemptAppend = () => {
        if (document.body) {
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        } else {
            setTimeout(attemptAppend, 50);
        }
    };
    attemptAppend();
}
