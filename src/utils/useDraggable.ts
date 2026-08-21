import { ref, onBeforeUnmount } from 'vue';

export function useDraggable(initialX: number = 12, initialY: number = 12, panelWidth: number = 280) {
    const position = ref({ x: initialX, y: initialY });
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initLeft = 0;
    let initTop = 0;
    let animationFrameId: number | null = null;

    const startDrag = (e: MouseEvent) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initLeft = position.value.x;
        initTop = position.value.y;
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    };

    const onDrag = (e: MouseEvent) => {
        if (!isDragging) return;
        
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const maxX = window.innerWidth - panelWidth;
            const maxY = window.innerHeight - 100;
            
            position.value = {
                x: Math.max(0, Math.min(initLeft + dx, maxX)),
                y: Math.max(0, Math.min(initTop + dy, maxY))
            };
            animationFrameId = null;
        });
    };

    const stopDrag = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };

    onBeforeUnmount(() => {
        stopDrag();
    });

    return { position, startDrag };
}
