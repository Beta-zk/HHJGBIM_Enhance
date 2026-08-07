<template>
  <div class="hhjgbim-sidebar" :class="{ 'is-expanded': isExpanded }">
    <!-- 方形触发按钮 -->
    <div class="toggle-btn" @click="togglePanel">
      <span class="icon">{{ isExpanded ? '>' : '<' }}</span>
    </div>

    <!-- 侧边栏菜单内容 -->
    <div class="sidebar-content">
      <div class="sidebar-header">🛠️ 增强面板</div>
      <div class="btn-list">
        <button class="action-btn" @click="openFactoryModal">
          📊 打开工厂产量
        </button>
        <button class="action-btn placeholder" disabled>
          🚧 预留功能模块
        </button>
        <button class="action-btn placeholder" disabled>
          🚧 预留功能模块
        </button>
      </div>
    </div>
  </div>

  <!-- 图表数据弹窗 (独立挂载) -->
  <FactoryOutputModal v-if="showModal" @close="showModal = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FactoryOutputModal from './components/FactoryOutputModal.vue';

const isExpanded = ref(false);
const showModal = ref(false);

const togglePanel = () => {
  isExpanded.value = !isExpanded.value;
};

const openFactoryModal = () => {
  showModal.value = true;
  // 打开弹窗时，可选择性自动收起侧边栏，减少画面遮挡
  isExpanded.value = false; 
};
</script>

<style scoped>
/* 侧边栏容器：垂直居中，靠最右侧 */
.hhjgbim-sidebar {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%) translateX(100%); /* 默认收起至屏幕外 */
  width: 220px;
  background: rgba(30, 41, 59, 0.95);
  color: #f8fafc;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  box-shadow: -5px 0 25px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
  z-index: 2147483646;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #334155;
  border-right: none;
}

/* 展开状态 */
.hhjgbim-sidebar.is-expanded {
  transform: translateY(-50%) translateX(0);
}

/* 侧边方形控制按钮 */
.toggle-btn {
  position: absolute;
  left: -40px; /* 向左凸出 */
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid #334155;
  border-right: none;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -5px 0 10px rgba(0,0,0,0.2);
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: #334155;
}

.toggle-btn .icon {
  font-family: monospace;
  font-size: 18px;
  font-weight: bold;
  color: #38bdf8;
}

/* 内容区排版 */
.sidebar-content {
  padding: 16px;
}

.sidebar-header {
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid #475569;
  padding-bottom: 10px;
  margin-bottom: 16px;
  text-align: center;
}

.btn-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  text-align: left;
}

.action-btn:hover:not(:disabled) {
  background: #475569;
  border-color: #38bdf8;
  color: #fff;
}

.action-btn.placeholder {
  opacity: 0.5;
  cursor: not-allowed;
  border-style: dashed;
}
</style>
