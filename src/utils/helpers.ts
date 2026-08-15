type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * @function showToast
 * @description 原生级 Naive UI 同款 Message 提示器
 * @param {string} msg 提示内容
 * @param {boolean | ToastType} typeOrStatus 状态（支持布尔值或 'success' | 'error' | 'warning' | 'info'）
 * @param {number} [duration=3000] 显示时长(ms)
 * @returns {void}
 */
export function showToast(
    msg: string, 
    typeOrStatus: boolean | ToastType = true,
    duration: number = 3000
): void {
    // 兼容原本的 boolean 传参，同时支持更多类型
    const type: ToastType = typeof typeOrStatus === 'boolean' 
        ? (typeOrStatus ? 'success' : 'error') 
        : typeOrStatus;

    // Naive UI 官方配色定义
    const colorMap: Record<ToastType, { iconColor: string; shadow: string }> = {
        success: { 
            iconColor: '#18a058', 
            shadow: '0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)' 
        },
        error: { 
            iconColor: '#d03050', 
            shadow: '0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)' 
        },
        warning: { 
            iconColor: '#f0a020', 
            shadow: '0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)' 
        },
        info: { 
            iconColor: '#2080f0', 
            shadow: '0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)' 
        }
    };

    // Naive UI / Ionicons 图标库同款 SVG
    const icons: Record<ToastType, string> = {
        success: `<svg viewBox="0 0 512 512" width="20" height="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192z"></path><path d="M352 176L217.6 336L160 272"></path></svg>`,
        error: `<svg viewBox="0 0 512 512" width="20" height="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192z"></path><path d="M320 320L192 192"></path><path d="M192 320l128-128"></path></svg>`,
        warning: `<svg viewBox="0 0 512 512" width="20" height="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192z"></path><path d="M250 160l6 144h-20l6-144h8z"></path><path d="M256 360a16 16 0 1 0 0-32a16 16 0 0 0 0 32z" fill="currentColor"></path></svg>`,
        info: `<svg viewBox="0 0 512 512" width="20" height="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192z"></path><path d="M260 220v140"></path><path d="M240 220h20"></path><path d="M256 160a16 16 0 1 0 0-32a16 16 0 0 0 0 32z" fill="currentColor"></path></svg>`
    };

    const currentConfig = colorMap[type];
    const toast = document.createElement('div');

    // Naive UI 浅色主题卡片样式
    toast.style.cssText = `
        position: fixed;
        top: 15%;
        left: 50%;
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        padding: 10px 16px;
        background-color: #ffffff;
        color: #333639;
        font-family: v-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-size: 14px;
        line-height: 1.5;
        border-radius: 3px;
        box-shadow: ${currentConfig.shadow};
        z-index: 2147483647;
        pointer-events: none;
        user-select: none;
        opacity: 0;
        transform: translate(-50%, -100%);
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // 图标容器
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        color: ${currentConfig.iconColor};
        font-size: 20px;
        flex-shrink: 0;
    `;
    iconSpan.innerHTML = icons[type];

    // 文本容器
    const textSpan = document.createElement('span');
    textSpan.style.cssText = `
        display: inline-block;
        word-break: break-word;
    `;
    textSpan.textContent = msg;

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);

    const attemptAppend = () => {
        if (document.body) {
            document.body.appendChild(toast);

            // 进场动画：顶部滑入 (Naive UI Transition)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    toast.style.opacity = '1';
                    toast.style.transform = 'translate(-50%, 0)';
                });
            });

            // 退出动画
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translate(-50%, -100%)';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        } else {
            setTimeout(attemptAppend, 50);
        }
    };

    attemptAppend();
}
