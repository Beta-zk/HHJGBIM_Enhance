<template>
  <div v-if="projectStateStore.isVisible"
       class="fixed z-[999999] w-[280px] bg-slate-300/70 border border-black/15 rounded-md flex flex-col shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-sm"
       :style="{ left: `${position.x}px`, top: `${position.y}px` }">
    
    <div class="px-3 py-1.5 cursor-move select-none text-[12px] text-slate-600 border-b border-black/10 bg-slate-200/50 rounded-t-md font-semibold tracking-wide"
         @mousedown="startDrag">
      ::: 按住此处拖动面板 :::
    </div>
    
    <div class="p-2.5 flex flex-wrap content-start gap-1.5">
      <div v-for="item in projectStateStore.states" :key="item.name"
           class="w-[80px] h-[26px] leading-[24px] text-[11px] border border-solid rounded cursor-pointer select-none transition-colors box-border whitespace-nowrap text-center overflow-hidden text-ellipsis"
           :style="getBtnStyle(item)"
           @click="projectStateStore.toggleState(item.name)">
        {{ item.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { projectStateStore, type IStateItem } from '../store';
// 注意：需确认 useDraggable 在通用目录已构建（参见上轮代码）
import { useDraggable } from '../../../utils/useDraggable';

const { position, startDrag } = useDraggable(12, 12, 280);

const getBtnStyle = (item: IStateItem) => {
    const isActive = projectStateStore.activeStates.has(item.name);
    return {
        borderColor: item.color,
        backgroundColor: isActive ? item.color : 'transparent',
        color: isActive ? 'white' : item.color
    };
};
</script>
