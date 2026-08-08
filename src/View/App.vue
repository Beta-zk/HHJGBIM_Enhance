<template>
  <div class="hhjgbim-sidebar" :class="{ 'is-expanded': isExpanded }">
    <div class="toggle-btn" @click="togglePanel">
      <span class="icon">{{ isExpanded ? '>' : '<' }}</span>
    </div>

    <div class="sidebar-content">
      <div class="sidebar-header">🛠️ 增强面板</div>
      <div class="btn-list">
        <button class="action-btn" @click="handleOpenReport" :disabled="isLoading">
          {{ isLoading ? '⏳ 数据拉取中...' : '📊 打开绩效统计表' }}
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

  <!-- 沉浸式全屏视图组件挂载点 -->
  <PerformanceReport 
    v-if="showReport" 
    :raw-data="reportData" 
    @close="showReport = false" 
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { factoryService } from '../services/FactoryService';
import PerformanceReport from './components/PerformanceReport.vue';

const isExpanded = ref(false);
const isLoading = ref(false);
const showReport = ref(false);
const reportData = ref<any[]>([]);

const togglePanel = () => {
  isExpanded.value = !isExpanded.value;
};

const handleOpenReport = async () => {
  isLoading.value = true;
  try {
    const res = await factoryService.fetchMonthlyOutput();
    if (res && res.StatusCode === 200 && res.IsSucceed && res.Data) {
      reportData.value = res.Data;
      showReport.value = true;   // 开启全屏面板
      isExpanded.value = false;  // 收起侧边栏
    } else {
      alert('接口返回异常或无数据');
    }
  } catch (error) {
    alert('网络请求失败');
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.hhjgbim-sidebar {
  position: fixed; top: 50%; right: 0; transform: translateY(-50%) translateX(100%); 
  width: 220px; background: rgba(30, 41, 59, 0.95); color: #f8fafc;
  border-top-left-radius: 8px; border-bottom-left-radius: 8px;
  box-shadow: -5px 0 25px rgba(0,0,0,0.3); backdrop-filter: blur(8px);
  z-index: 2147483646; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #334155; border-right: none;
}
.hhjgbim-sidebar.is-expanded { transform: translateY(-50%) translateX(0); }
.toggle-btn {
  position: absolute; left: -40px; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px; background: rgba(30, 41, 59, 0.95);
  border: 1px solid #334155; border-right: none; border-top-left-radius: 8px; border-bottom-left-radius: 8px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.toggle-btn:hover { background: #334155; }
.toggle-btn .icon { font-family: monospace; font-size: 18px; font-weight: bold; color: #38bdf8; }
.sidebar-content { padding: 16px; }
.sidebar-header { font-size: 14px; font-weight: 600; border-bottom: 1px solid #475569; padding-bottom: 10px; margin-bottom: 16px; text-align: center; }
.btn-list { display: flex; flex-direction: column; gap: 10px; }
.action-btn { background: #334155; color: #e2e8f0; border: 1px solid #475569; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 13px; text-align: left; }
.action-btn:hover:not(:disabled) { background: #475569; border-color: #38bdf8; color: #fff; }
.action-btn.placeholder { opacity: 0.5; cursor: not-allowed; border-style: dashed; }
</style>
