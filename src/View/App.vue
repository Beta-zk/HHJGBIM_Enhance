<template>
  <div class="hhjgbim-ui-container">
    <div class="panel-header">🏭 工厂月度产值统计</div>
    
    <div class="table-wrapper">
      <!-- 状态拦截区 -->
      <div v-if="loading" class="status-text">⏳ 正在等待鉴权并拉取数据...</div>
      <div v-else-if="errorMsg" class="status-text error">{{ errorMsg }}</div>
      <div v-else-if="!tableData.length" class="status-text">⚠️ 暂无有效产值数据</div>
      
      <!-- 实体数据表格 -->
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>月份</th>
            <th>车间标识</th>
            <th>数量 (Amount)</th>
            <th>产值 (Value)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in tableData" :key="index">
            <td class="col-month">{{ item.Name }}月</td>
            <td>{{ item.Workshop_Id ?? '-' }}</td>
            <td>{{ item.Amount ?? '-' }}</td>
            <td class="col-value">{{ item.Value !== null ? item.Value.toFixed(3) : '暂无数据' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { factoryService } from '../services/FactoryService';

// 1. 根据传入的 JSON 结构定义严格的 TS 类型
interface MonthlyData {
  Workshop_Id: string | null;
  Name: string;
  Amount: number | null;
  Value: number | null;
}

interface ApiResponse {
  Data: MonthlyData[];
  IsSucceed: boolean;
  IsNeedData: boolean;
  Message: string | null;
  StatusCode: number;
}

// 2. 响应式状态声明
const loading = ref(true);
const errorMsg = ref('');
const tableData = ref<MonthlyData[]>([]);

// 3. 挂载时请求逻辑
onMounted(async () => {
  try {
    const res = await factoryService.fetchMonthlyOutput() as ApiResponse;
    console.log('[HHJGBIM_Enhance_UI] 🏭 真实产值数据返回:', res);
    
    // 严格校验业务状态码
    if (res && res.StatusCode === 200 && res.IsSucceed) {
      tableData.value = res.Data || [];
    } else {
      errorMsg.value = res?.Message || '接口返回状态异常 (非200或IsSucceed为false)';
    }
  } catch (error) {
    console.error('[HHJGBIM_Enhance_UI] 数据加载引发崩溃:', error);
    errorMsg.value = '网络请求失败，请检查控制台日志';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.hhjgbim-ui-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  background: rgba(30, 41, 59, 0.95);
  color: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
  border: 1px solid #334155;
}

.panel-header {
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid #475569;
  padding-bottom: 10px;
  margin-bottom: 12px;
  color: #e2e8f0;
}

.table-wrapper {
  max-height: 280px;
  overflow-y: auto;
}

.status-text {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 24px 0;
}

.status-text.error {
  color: #f87171;
}

/* 表格视觉规范 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th, .data-table td {
  border: 1px solid #475569;
  padding: 8px 10px;
  text-align: left;
}

.data-table th {
  background-color: #334155;
  position: sticky;
  top: 0;
  z-index: 1;
  color: #94a3b8;
  font-weight: 500;
}

.data-table tbody tr:nth-child(even) {
  background-color: rgba(255, 255, 255, 0.02);
}

.data-table tbody tr:hover {
  background-color: rgba(56, 189, 248, 0.1);
}

.col-month {
  font-weight: 600;
  color: #38bdf8;
}

.col-value {
  font-family: monospace;
  color: #a7f3d0;
}

/* 滚动条美化 */
.table-wrapper::-webkit-scrollbar {
  width: 6px;
}
.table-wrapper::-webkit-scrollbar-thumb {
  background: #64748b;
  border-radius: 3px;
}
</style>
