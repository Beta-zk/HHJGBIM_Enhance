<template>
  <div class="fullscreen-report-overlay">
    <div class="report-page-container">
      <div class="page-header">
        <span class="title">绩效考核统计视窗</span>
        <button class="close-btn" @click="$emit('close')">✖ 关闭视图</button>
      </div>

      <div class="dashboard-layout">
        <!-- 左侧：原生 DOM 表格区 (红框范围)，支持局部垂直滚动 -->
        <div class="table-section">
          <div class="table-wrapper">
            
            <!-- 报表一：工厂产量 -->
            <div class="native-table-container">
              <h3 class="table-title">工厂产量</h3>
              <table class="native-table">
                <thead>
                  <tr>
                    <th v-for="m in monthNames" :key="'out-h-'+m">{{ m }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td v-for="(v, index) in monthValues" :key="'out-v-'+index">{{ v }}</td>
                  </tr>
                  <tr>
                    <th colspan="3">第一季度</th>
                    <th colspan="3">第二季度</th>
                    <th colspan="3">第三季度</th>
                    <th colspan="3">第四季度</th>
                  </tr>
                  <tr>
                    <td colspan="3">{{ formattedQuarterValues[0] }}</td>
                    <td colspan="3">{{ formattedQuarterValues[1] }}</td>
                    <td colspan="3">{{ formattedQuarterValues[2] }}</td>
                    <td colspan="3">{{ formattedQuarterValues[3] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 报表二：深化重量 -->
            <div class="native-table-container">
              <h3 class="table-title">深化重量</h3>
              <table class="native-table">
                <thead>
                  <tr>
                    <th v-for="m in monthNames" :key="'weight-h-'+m">{{ m }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td v-for="index in 12" :key="'weight-v-'+index">0</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
        
        <!-- 右侧：动态图表组件区 (黄框范围) -->
        <div class="chart-section">
          <!-- 预留动态组件插槽，未来可通过修改 activeChartComponent 无缝切换其它图表组件 -->
          <component 
            :is="activeChartComponent" 
            :month-names="monthNames"
            :month-values="monthValues"
            :quarter-values="formattedQuarterValues"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, nextTick } from 'vue';
// 引入解耦后的图表组件
import FactoryOutputChart from './PerformanceReport/FactoryOutputChart.vue';

const props = defineProps<{
  rawData: any[]
}>();

// 使用 shallowRef 挂载组件，优化 Vue 底层代理性能，预留切换接口
const activeChartComponent = shallowRef(FactoryOutputChart);

const monthNames = ref<string[]>([]);
const monthValues = ref<number[]>([]);
const formattedQuarterValues = ref<number[]>([]);

const monthMap: Record<string, string> = {
  '1': '一月', '2': '二月', '3': '三月', '4': '四月', 
  '5': '五月', '6': '六月', '7': '七月', '8': '八月', 
  '9': '九月', '10': '十月', '11': '十一月', '12': '十二月'
};

onMounted(async () => {
  await nextTick();
  processData();
});

const processData = () => {
  const tempMonthNames: string[] = [];
  const tempMonthValues: number[] = [];
  const quarterValues = [0, 0, 0, 0];

  props.rawData.forEach(item => {
    const val = item.Value || 0;
    const monthInt = parseInt(item.Name, 10);
    
    tempMonthNames.push(monthMap[item.Name] || `${item.Name}月`);
    tempMonthValues.push(val);

    if (monthInt >= 1 && monthInt <= 3) quarterValues[0] += val;
    else if (monthInt >= 4 && monthInt <= 6) quarterValues[1] += val;
    else if (monthInt >= 7 && monthInt <= 9) quarterValues[2] += val;
    else if (monthInt >= 10 && monthInt <= 12) quarterValues[3] += val;
  });

  monthNames.value = tempMonthNames;
  monthValues.value = tempMonthValues;
  formattedQuarterValues.value = quarterValues.map(v => Number(v.toFixed(3)));
};
</script>

<style scoped>
/* 最顶层遮罩，锁定全局滚动 */
.fullscreen-report-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100vw; height: 100vh;
  z-index: 2147483647;
  background-color: #1e293b;
  overflow: hidden; /* 禁止全局视窗发生滚动 */
}

.report-page-container {
  height: 100vh;
  padding: 30px 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0; /* 保证标题栏不被压缩 */
}

.page-header .title { color: #f8fafc; font-weight: 600; font-size: 20px; letter-spacing: 1px; }

.close-btn {
  background: transparent; border: 1px solid #475569; border-radius: 4px;
  color: #94a3b8; padding: 6px 12px; font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.close-btn:hover { background: #334155; color: #f8fafc; border-color: #f8fafc; }

/* Dashboard 核心布局，关键点：min-height: 0 激活子元素的局部滚动 */
.dashboard-layout {
  display: flex;
  flex: 1;
  gap: 50px;
  align-items: stretch;
  min-height: 0; 
}

/* -------------------------------------
   左侧 (红框区)：原生表格布局约束体系 
-------------------------------------- */
.table-section {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* 核心：内容超载时生成局部滚动条 */
  padding-right: 15px; /* 为滚动条预留空间，防止挤压表格内容 */
}

/* 定制化美化暗黑风格滚动条 (Webkit) */
.table-section::-webkit-scrollbar { width: 6px; }
.table-section::-webkit-scrollbar-track { background: transparent; }
.table-section::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
.table-section::-webkit-scrollbar-thumb:hover { background: #64748b; }

.table-wrapper {
  /* 移除丑陋的白色大底色，使其直接融入暗黑容器 */
  display: flex;
  flex-direction: column;
  gap: 50px; 
  padding-bottom: 30px; /* 触底预留呼吸空间 */
}

.native-table-container { width: 100%; }

.table-title {
  text-align: center;
  color: #f8fafc; /* 修正：适配暗黑背景的亮色标题 */
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 15px 0;
  letter-spacing: 1px;
}

/* 核心原生表格样式：白底全量黑边框，绝对居中 */
.native-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background-color: #ffffff; /* 表格主体保持白色 */
}

.native-table th,
.native-table td {
  border: 2px solid #000000;
  text-align: center;
  vertical-align: middle;
  padding: 14px 8px;
  color: #000000;
  font-size: 14px;
}

.native-table th { background-color: #f1f5f9; font-weight: bold; }
.native-table td { background-color: #ffffff; }

/* -------------------------------------
   右侧 (黄框区)：图表布局约束体系
-------------------------------------- */
.chart-section {
  flex: 1;
  /* 右侧无需滚动，始终固定占满高度 */
  display: flex;
  flex-direction: column;
}
</style>
