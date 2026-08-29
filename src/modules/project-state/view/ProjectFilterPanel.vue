<template>
  <!-- 将 Teleport 目标调整为 #hhjgbim-vue-root，以确保 Tailwind 的 important 作用域能够覆盖悬浮窗 -->
  <Teleport to="#hhjgbim-vue-root">
    <div v-if="store.isVisible"
         ref="widgetRef"
         class="fixed z-[8000] select-none"
         :style="{ left: position.x + 'px', top: position.y + 'px' }">

      <!-- 悬浮窗形态：点击状态圆点弹出，全局可拖拽 -->
      <Transition name="pop">
        <div v-if="isExpanded"
             class="w-[220px] bg-white rounded-[6px] shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-solid border-[#ebeef5] overflow-hidden cursor-move origin-left"
             @mousedown="startDrag">

          <div class="px-[14px] py-[10px] bg-[#f8f9fa] border-0 border-b border-solid border-[#ebeef5] flex justify-between items-center cursor-move">
            <span class="text-[13px] font-semibold text-[#303133]">筛选工程状态</span>
            <span class="cursor-pointer text-[16px] text-[#909399] leading-none px-1 transition-colors duration-[0.2s] hover:text-[#f56c6c]"
                  @click="toggleExpand" title="收起">×</span>
          </div>

          <div class="p-[10px] max-h-[350px] overflow-y-auto scrollbar-custom">
            <div v-for="state in store.states"
                 :key="state.name"
                 class="flex items-center px-[12px] py-[8px] mb-[6px] rounded-[4px] cursor-pointer text-[13px] text-[#606266] bg-[#f5f7fa] transition-all duration-[0.2s] last:mb-0 hover:bg-[#ecf5ff]"
                 :class="{ '!bg-[#e1f3d8] !text-[#67c23a] font-medium': store.activeStates.has(state.name) }"
                 @click="onStateClick(state.name)">
              <span class="w-[8px] h-[8px] rounded-full mr-[10px] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                    :style="{ backgroundColor: state.color }"></span>
              {{ state.name }}
            </div>
          </div>

        </div>
      </Transition>

    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { projectStateStore } from '../store';
import { useDraggable } from '../../../utils/useDraggable';

const store = projectStateStore;
const isExpanded = ref(false);
const widgetRef = ref<HTMLElement | null>(null);

const { position, startDrag, hasDragged } = useDraggable({
  axis: 'both',
  containerRef: widgetRef
});

/**
 * @function locateAtTableTopLeft
 * @description 面板默认位置计算：定位至表格（vxe-table）左上角，取视口坐标供 fixed 定位
 */
const locateAtTableTopLeft = () => {
  const csMain = document.querySelector('.cs-z-page-main-content .cs-main');
  const table = csMain?.querySelector<HTMLElement>('.vxe-table') || csMain;
  if (!table) return;
  const rect = table.getBoundingClientRect();
  position.value = {
    x: Math.max(8, Math.round(rect.left + 8)),
    y: Math.max(8, Math.round(rect.top + 8))
  };
};

watch(() => store.panelTrigger, (count) => {
  if (count <= 0) return;
  locateAtTableTopLeft();
  isExpanded.value = true;
});

/**
 * @function toggleExpand
 * @description 切换悬浮面板的折叠/展开状态，拦截拖拽遗留事件
 * @param {MouseEvent} e - 鼠标事件载荷
 */
const toggleExpand = (e: MouseEvent) => {
  if (hasDragged.value) return;
  isExpanded.value = !isExpanded.value;
};

/**
 * @function onStateClick
 * @description 状态项点击处理器，拖拽中产生的 click 直接丢弃避免误触发
 * @param {string} name - 选中的工程状态名
 */
const onStateClick = (name: string) => {
  if (hasDragged.value) return;
  store.toggleState(name);
};
</script>

<style scoped>
/* 弹出动画：轻量缩放淡入（仅保留逻辑相关 CSS） */
.pop-enter-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.pop-enter-from {
  transform: scale(0.92);
  opacity: 0;
}
</style>
