import { ref, onBeforeUnmount, type Ref } from 'vue';

export interface UseDraggableOptions {
    initialX?: number;
    initialY?: number;
    /** 允许拖拽的轴向锁定 */
    axis?: 'x' | 'y' | 'both';
    /** 用于进行物理边界碰撞探测的自身节点 Ref */
    containerRef?: Ref<HTMLElement | null>;
}

export function useDraggable(options: UseDraggableOptions = {}) {
    const { initialX = 0, initialY = 100, axis = 'both', containerRef } = options;
    const position = ref({ x: initialX, y: initialY });
    
    const isDragging = ref(false);
    const hasDragged = ref(false);

    let startX = 0;
    let startY = 0;
    let initX = 0;
    let initY = 0;
    let animationFrameId: number | null = null;

    const startDrag = (e: MouseEvent) => {
        isDragging.value = true;
        hasDragged.value = false;
        startX = e.clientX;
        startY = e.clientY;
        initX = position.value.x;
        initY = position.value.y;
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    };

    const onDrag = (e: MouseEvent) => {
        if (!isDragging.value) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // 曼哈顿距离探测防抖：超限判定为真实拖拽，以拦截 click 误触
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasDragged.value = true;
        }
        
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
            let nextX = initX + dx;
            let nextY = initY + dy;
            
            // 物理边界碰撞判定
            if (containerRef && containerRef.value) {
                const selfRect = containerRef.value.getBoundingClientRect();
                const parentEl = containerRef.value.parentElement;
                
                if (parentEl) {
                    const parentRect = parentEl.getBoundingClientRect();
                    const maxX = parentRect.height - selfRect.height;
                    const maxY = parentRect.height - selfRect.height;
                    
                    nextX = Math.max(0, Math.min(nextX, parentRect.width - selfRect.width));
                    nextY = Math.max(0, Math.min(nextY, maxY));
                }
            }
            
            if (axis === 'both' || axis === 'x') position.value.x = nextX;
            if (axis === 'both' || axis === 'y') position.value.y = nextY;
            
            animationFrameId = null;
        });
    };

    const stopDrag = () => {
        isDragging.value = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // 延迟复位意图标量，保证 click 事件周期内能够读取其拦截态
        setTimeout(() => {
            hasDragged.value = false;
        }, 50);
    };

    onBeforeUnmount(() => {
        stopDrag();
    });

    return { position, startDrag, hasDragged, isDragging };
}
