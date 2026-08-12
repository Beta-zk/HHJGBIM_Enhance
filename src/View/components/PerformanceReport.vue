<template>
  <div class="fullscreen-report-overlay">
    <div class="report-page-container">
      <div class="page-header">
        <span class="title">绩效考核统计视窗</span>
        <button class="close-btn" @click="$emit('close')">✖ 关闭</button>
      </div>

      <div class="dashboard-layout">
        <div class="table-section">
          <div class="table-wrapper">

            <!-- 报表一：工厂产量 -->
            <div class="native-table-container" @mouseenter="activeChartType = 'factory'">
              <h3 class="table-title">工厂产量(t)</h3>
              <table class="native-table">
                <thead>
                  <tr>
                    <th v-for="m in monthNames" :key="'out-h-' + m">{{ m }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td v-for="(v, index) in factoryMonthValues" :key="'out-v-' + index">{{ v }}</td>
                  </tr>
                  <tr>
                    <th colspan="3">第一季度</th>
                    <th colspan="3">第二季度</th>
                    <th colspan="3">第三季度</th>
                    <th colspan="3">第四季度</th>
                  </tr>
                  <tr>
                    <td colspan="3">{{ factoryQuarterValues[0] }}</td>
                    <td colspan="3">{{ factoryQuarterValues[1] }}</td>
                    <td colspan="3">{{ factoryQuarterValues[2] }}</td>
                    <td colspan="3">{{ factoryQuarterValues[3] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 报表二：深化重量 -->
            <div class="native-table-container" @mouseenter="activeChartType = 'component'">
              <h3 class="table-title">深化重量(t)</h3>
              <table class="native-table">
                <thead>
                  <tr>
                    <th v-for="m in monthNames" :key="'weight-h-' + m">{{ m }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td v-for="(v, index) in compMonthValues" :key="'weight-v-' + index">{{ v }}</td>
                  </tr>

                  <!-- 【修正点】：剥离辅助说明文字，直接渲染月份变量 -->
                  <tr>
                    <th colspan="4">姓名</th>
                    <th colspan="4">{{ personnelMatrix.prevMonth }}</th>
                    <th colspan="4">{{ personnelMatrix.currMonth }}</th>
                  </tr>
                  <tr v-for="(person, idx) in personnelMatrix.list" :key="'p-' + idx">
                    <td colspan="4">{{ person.name }}</td>
                    <td colspan="4">{{ person.prevWeight }}</td>
                    <td colspan="4">{{ person.currWeight }}</td>
                  </tr>
                  <tr v-if="personnelMatrix.list.length === 0">
                    <td colspan="12" style="color: #64748b; font-style: italic;">暂未在偏好设置中配置深化人员名单...</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        <div class="chart-section">
          <Chart :active-type="activeChartType" :month-names="monthNames" :month-values="currentChartMonthValues"
            :quarter-values="currentChartQuarterValues" :personnel-matrix="personnelMatrix"
            :config="currentChartConfig" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import Chart from './PerformanceReport/Chart.vue';

const props = defineProps<{
  rawData: any[];
  componentData: any;
  personnelMatrix: any;
}>();

const monthNames = ref<string[]>([]);
const factoryMonthValues = ref<number[]>([]);
const factoryQuarterValues = ref<number[]>([]);
const compMonthValues = ref<number[]>(new Array(12).fill(0));
const compQuarterValues = ref<number[]>([0, 0, 0, 0]);

const activeChartType = ref<'factory' | 'component'>('factory');

const currentChartMonthValues = computed(() => {
  return activeChartType.value === 'factory' ? factoryMonthValues.value : compMonthValues.value;
});

const currentChartQuarterValues = computed(() => {
  return activeChartType.value === 'factory' ? factoryQuarterValues.value : compQuarterValues.value;
});

const currentChartConfig = computed(() => {
  return activeChartType.value === 'factory'
    ? { monthTitle: '月度产量(t)', quarterTitle: '季度产量(t)', monthColor: '#38bdf8', quarterColor: '#10b981' }
    : { monthTitle: '月度深化重量(t)', quarterTitle: '人员深化对比(t)', monthColor: '#8b5cf6', quarterColor: '#f59e0b' };
});

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
  const tempFactoryMonths: number[] = [];
  const tempFactoryQuarters = [0, 0, 0, 0];

  props.rawData.forEach(item => {
    const val = item.Value || 0;
    const monthInt = parseInt(item.Name, 10);
    tempMonthNames.push(monthMap[item.Name] || `${item.Name}月`);
    tempFactoryMonths.push(val);
    if (monthInt >= 1 && monthInt <= 3) tempFactoryQuarters[0] += val;
    else if (monthInt >= 4 && monthInt <= 6) tempFactoryQuarters[1] += val;
    else if (monthInt >= 7 && monthInt <= 9) tempFactoryQuarters[2] += val;
    else if (monthInt >= 10 && monthInt <= 12) tempFactoryQuarters[3] += val;
  });

  monthNames.value = tempMonthNames.length === 12 ? tempMonthNames : Object.values(monthMap);
  factoryMonthValues.value = tempFactoryMonths;
  factoryQuarterValues.value = tempFactoryQuarters.map(v => Number(v.toFixed(3)));

  const tempCompMonths = new Array(12).fill(0);
  const tempCompQuarters = [0, 0, 0, 0];

  if (props.componentData && props.componentData.Data && Array.isArray(props.componentData.Data)) {
    props.componentData.Data.forEach((item: any) => {
      const parts = item.Month?.split('-');
      if (parts && parts.length === 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const val = (item.GrossTotal || 0) / 1000;
        if (mIdx >= 0 && mIdx < 12) {
          tempCompMonths[mIdx] = val;
          tempCompQuarters[Math.floor(mIdx / 3)] += val;
        }
      }
    });
  }
  compMonthValues.value = tempCompMonths.map(v => Number(v.toFixed(3)));
  compQuarterValues.value = tempCompQuarters.map(v => Number(v.toFixed(3)));
};
</script>

<style scoped>
/* 延续之前 PerformanceReport.vue 的样式，保持不变 */
.fullscreen-report-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2147483647;
  background-color: #1e293b;
  overflow: hidden;
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
  flex-shrink: 0;
}

.page-header .title {
  color: #f8fafc;
  font-weight: 600;
  font-size: 20px;
  letter-spacing: 1px;
}

.close-btn {
  background: transparent;
  border: 1px solid #475569;
  border-radius: 4px;
  color: #94a3b8;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #334155;
  color: #f8fafc;
  border-color: #f8fafc;
}

.dashboard-layout {
  display: flex;
  flex: 1;
  gap: 50px;
  align-items: stretch;
  min-height: 0;
}

.table-section {
  flex: 1.5;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-right: 15px;
}

.table-section::-webkit-scrollbar {
  width: 6px;
}

.table-section::-webkit-scrollbar-track {
  background: transparent;
}

.table-section::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

.table-section::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: 50px;
  padding-bottom: 30px;
}

.native-table-container {
  width: 100%;
  transition: background-color 0.3s;
  padding: 10px;
  border-radius: 8px;
}

.native-table-container:hover {
  background-color: rgba(51, 65, 85, 0.4);
  cursor: default;
}

.table-title {
  text-align: center;
  color: #f8fafc;
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 15px 0;
  letter-spacing: 1px;
}

.native-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background-color: transparent;
}

.native-table th,
.native-table td {
  border: 1px solid #475569;
  text-align: center;
  vertical-align: middle;
  padding: 14px 8px;
  font-size: 14px;
}

.native-table th {
  background-color: #1a202c;
  color: #f8fafc;
  font-weight: bold;
}

.native-table td {
  background-color: transparent;
  color: #e2e8f0;
}

.native-table tbody th {
  background-color: #2d3748;
  color: #f1f5f9;
}

.chart-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
