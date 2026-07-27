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
    function search(obj: any) {
        if (result) return;
        if (Array.isArray(obj)) {
            if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && key in obj[0]) {
                result = obj; return;
            }
            for (let i = 0; i < obj.length; i++) search(obj[i]);
        } else if (obj !== null && typeof obj === 'object') {
            for (const k in obj) search(obj[k]);
        }
    }
    search(data);
    return result;
}
