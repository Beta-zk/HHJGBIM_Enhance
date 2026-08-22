<template>
  <!-- 利用 Teleport 将视图沙箱硬路由至宿主表格容器，锚点动态对齐表格左边缘 -->
  <Teleport to=".cs-z-page-main-content .cs-main" :disabled="!isTargetReady">
    <div v-if="store.isVisible"
         ref="widgetRef"
         class="hhjg-state-widget"
         :class="{ 'is-expanded': isExpanded, 'is-dragging': isDragging }"
         :style="{ top: position.y + 'px', left: anchorLeft + 'px' }">

      <!-- 悬浮球形态：骑跨表格左边缘、遮挡 80%、锁定 Y 轴拖拽 -->
      <div v-if="!isExpanded"
           class="state-ball"
           @mousedown="startDrag"
           @click="toggleExpand"
           title="点击展开项目筛选">
        <svg viewBox="0 0 1024 1024" width="20" height="20">
          <path d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896z" fill="#409eff"/>
          <path d="M704 384H320c-17.6 0-32 14.4-32 32s14.4 32 32 32h384c17.6 0 32-14.4 32-32s-14.4-32-32-32zM704 576H320c-17.6 0-32 14.4-32 32s14.4 32 32 32h384c17.6 0 32-14.4 32-32s-14.4-32-32-32z" fill="#ffffff"/>
        </svg>
      </div>

      <!-- 面板形态：整体可拖拽，向右平移展开，提供全量数据交互 -->
      <div v-else class="state-panel" @mousedown="startDrag">
        <div class="panel-header">
          <span class="title">生命周期状态 (拖拽)</span>
          <span class="close-btn" @click="toggleExpand" title="收起至边缘">×</span>
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

    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { projectStateStore } from '../store';
import { useDraggable } from '../../../utils/useDraggable';

const store = projectStateStore;
const isExpanded = ref(false);
const isTargetReady = ref(false);
const widgetRef = ref<HTMLElement | null>(null);

/** 面板展开时相对表格左缘的额外右移量 (px) */
const EXPAND_OFFSET = 16;

/** 表格左边缘相对 .cs-main 容器的水平偏移，用于贴合源码中的 vxe-table 左缘 */
const tableOffsetLeft = ref(0);

// 初始化底层拖拽引擎，锁定 Y 轴避免脱离表格左边界；isDragging 用于拖拽中保持球体滑出
const { position, startDrag, hasDragged, isDragging } = useDraggable({
  initialY: 150,
  axis: 'y',
  containerRef: widgetRef
});

/** 锚点左偏移：收起态贴表格左缘；展开态额外右移 EXPAND_OFFSET */
const anchorLeft = computed(() => tableOffsetLeft.value + (isExpanded.value ? EXPAND_OFFSET : 0));

let domObserver: MutationObserver | null = null;

/** 测量表格(vxe-table)左缘相对 .cs-main 的水平偏移；表格未就绪时回退 0 */
const measureTableOffset = (): number => {
  const csMain = document.querySelector('.cs-z-page-main-content .cs-main');
  if (!csMain) return 0;
  const table = csMain.querySelector('.vxe-table');
  if (!table) return 0;
  return table.getBoundingClientRect().left - csMain.getBoundingClientRect().left;
};

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

const probeHostContainer = () => {
  const target = document.querySelector('.cs-z-page-main-content .cs-main');
  if (target) {
    isTargetReady.value = true;
    // 强制修正宿主坐标系：赋予 target 定位上下文，防止 absolute 逃逸
    if (window.getComputedStyle(target).position === 'static') {
      (target as HTMLElement).style.position = 'relative';
    }
    tableOffsetLeft.value = measureTableOffset();
  } else {
    isTargetReady.value = false;
  }
};

const handleResize = () => {
  tableOffsetLeft.value = measureTableOffset();
};

onMounted(() => {
  probeHostContainer();
  // 利用变动观测器兜底 SPA 路由异步渲染造成的节点延时就绪问题
  domObserver = new MutationObserver(() => probeHostContainer());
  domObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  domObserver?.disconnect();
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.hhjg-state-widget {
  position: absolute;
  z-index: 8000;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 形态 1：悬浮球 (骑跨表格左缘，负向隐藏 80%，仅露出 20% 作为点击手柄) */
.hhjg-state-widget:not(.is-expanded) {
  transform: translateX(-80%);
}

/* hover 探头增强：悬停时临时滑出至露出 60%，提升可发现性与点击容错 */
.hhjg-state-widget:not(.is-expanded):hover {
  transform: translateX(-40%);
}

/* 拖拽保持：按住拖动期间维持滑出姿态，避免 transform 回缩导致拖拽中断 */
.hhjg-state-widget:not(.is-expanded).is-dragging {
  transform: translateX(-40%);
}

/* 形态 2：展开面板 (向右平移一段距离展开，抵消左边缘挤压) */
.hhjg-state-widget.is-expanded {
  transform: translateX(0);
}

.state-ball {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 使图标偏向未隐藏的一侧 */
  padding-right: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s, background-color 0.2s;
  user-select: none;
}

.state-ball:hover {
  background-color: #f2f6fc;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.state-panel {
  width: 220px;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  border: 1px solid #ebeef5;
  overflow: hidden;
  cursor: move;
  user-select: none;
}

.panel-header {
  padding: 10px 14px;
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
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
  user-select: none;
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
</style>
