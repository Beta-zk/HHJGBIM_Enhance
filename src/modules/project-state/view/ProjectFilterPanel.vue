<template>
  <!-- 独立悬浮窗：挂载至 body，由表格状态圆点点击触发弹出，默认定位表格左上角 -->
  <Teleport to="body">
    <div v-if="store.isVisible"
         ref="widgetRef"
         class="hhjg-state-widget"
         :style="{ left: position.x + 'px', top: position.y + 'px' }">

      <!-- 悬浮窗形态：点击状态圆点弹出，全局可拖拽 -->
      <Transition name="pop">
        <div v-if="isExpanded"
             class="state-panel"
             @mousedown="startDrag">
          <div class="panel-header">
            <span class="title">筛选工程状态</span>
            <span class="close-btn" @click="toggleExpand" title="收起">×</span>
          </div>
          <div class="panel-body scrollbar-custom">
            <div v-for="state in store.states"
                 :key="state.name"
                 class="state-item"
                 :class="{ active: store.activeStates.has(state.name) }"
                 @click="onStateClick(state.name)">
              <span class="indicator" :style="{ backgroundColor: state.color }"></span>
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

/** 面板默认位置：表格（vxe-table）左上角，取视口坐标供 fixed 定位 */
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

const toggleExpand = (e: MouseEvent) => {
  // 意图分离：拦截拖拽遗留事件，确保只有纯净的点按操作才能触发状态机流转
  if (hasDragged.value) return;
  isExpanded.value = !isExpanded.value;
};

/** 状态项点击：拖拽中产生的 click 直接丢弃，避免拖拽面板误触发筛选切换 */
const onStateClick = (name: string) => {
  if (hasDragged.value) return;
  store.toggleState(name);
};
</script>

<style scoped>
.hhjg-state-widget {
  position: fixed;
  z-index: 8000;
  user-select: none;
}

/* 悬浮窗：独立弹窗主题 */
.state-panel {
  width: 220px;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  border: 1px solid #ebeef5;
  overflow: hidden;
  cursor: move;
  transform-origin: left center;
}

.panel-header {
  padding: 10px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

.panel-header .title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.panel-header .close-btn {
  cursor: pointer;
  font-size: 16px;
  color: #909399;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.2s;
}

.panel-header .close-btn:hover {
  color: #f56c6c;
}

.panel-body {
  padding: 10px;
  max-height: 350px;
  overflow-y: auto;
}

.state-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  transition: all 0.2s;
}

.state-item:last-child {
  margin-bottom: 0;
}

.state-item:hover {
  background: #ecf5ff;
}

.state-item.active {
  background: #e1f3d8;
  color: #67c23a;
  font-weight: 500;
}

.state-item .indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* 弹出动画：轻量缩放淡入 */
.pop-enter-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.pop-enter-from {
  transform: scale(0.92);
  opacity: 0;
}
</style>
