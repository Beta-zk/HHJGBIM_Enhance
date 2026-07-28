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

export function findArrayWithKey(data: any, key: string): any[] | null {
    let result: any[] | null = null;
    const seen = new Set(); // 阻断对象相互嵌套导致的调用栈溢出

    function search(obj: any) {
        if (result) return;
        if (obj === null || typeof obj !== 'object') return;
        if (seen.has(obj)) return;
        seen.add(obj);

        if (Array.isArray(obj)) {
            // 放宽寻址条件：只要数组中存在任意有效对象满足包含指定 Key，即认定命中目标
            const hasTarget = obj.some(item => typeof item === 'object' && item !== null && key in item);
            if (hasTarget) {
                result = obj;
                return;
            }
            for (let i = 0; i < obj.length; i++) search(obj[i]);
        } else {
            for (const k in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, k)) {
                    search(obj[k]);
                }
            }
        }
    }
    
    search(data);
    return result;
}
