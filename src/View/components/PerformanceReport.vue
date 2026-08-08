<template>
  <div class="fullscreen-report-overlay">
    <div class="report-page-container">
      <div class="page-header">
        <!-- 修正视窗全局标题 -->
        <span class="title">绩效考核统计视窗</span>
        <button class="close-btn" @click="$emit('close')">✖ 关闭视图</button>
      </div>

      <div class="dashboard-layout">
        <!-- 左侧：纯原生 DOM 驱动的表格排版区域 -->
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

            <!-- 报表二：深化重量 (接口占位) -->
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
                    <!-- 由于暂无接口，填入 0 作为占位符 -->
                    <td v-for="index in 12" :key="'weight-v-'+index">0</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
        
        <!-- 右侧：无损保留原版暗黑主题双图表组件 -->
        <div class="chart-section">
          <div ref="monthChartRef" class="chart-box"></div>
          <div ref="quarterChartRef" class="chart-box"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{
  rawData: any[]
}>();

// 右侧图表容器引用
const monthChartRef = ref<HTMLDivElement | null>(null);
const quarterChartRef = ref<HTMLDivElement | null>(null);

let monthChartInstance: echarts.ECharts | null = null;
let quarterChartInstance: echarts.ECharts | null = null;

// 表格所需的响应式数据源
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
  processAndRenderData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  monthChartInstance?.dispose();
  quarterChartInstance?.dispose();
});

const handleResize = () => {
  monthChartInstance?.resize();
  quarterChartInstance?.resize();
};

const processAndRenderData = () => {
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

  // 挂载响应式状态以供原生 HTML 表格循环渲染
  monthNames.value = tempMonthNames;
  monthValues.value = tempMonthValues;
  formattedQuarterValues.value = quarterValues.map(v => Number(v.toFixed(3)));

  // 初始化图表实例
  monthChartInstance = initChart(monthChartRef.value, '月度产量', tempMonthNames, tempMonthValues, '#38bdf8');
  quarterChartInstance = initChart(quarterChartRef.value, '季度产量', ['一季度', '二季度', '三季度', '四季度'], formattedQuarterValues.value, '#10b981');
};

const initChart = (dom: HTMLElement | null, title: string, xAxisData: string[], seriesData: number[], color: string) => {
  if (!dom) return null;
  const myChart = echarts.init(dom);
  const option = {
    title: { 
      text: title, 
      left: 'center',
      textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '3%', bottom: '5%', top: '20%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: xAxisData,
      axisLabel: { color: '#94a3b8', interval: 0 },
      axisTick: { alignWithLabel: true }
    },
    yAxis: { 
      type: 'value',
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
      axisLabel: { color: '#94a3b8' }
    },
    series: [
      {
        data: seriesData,
        type: 'bar',
        barWidth: '25%',
        itemStyle: { borderRadius: [4, 4, 0, 0], color: color },
        label: { show: true, position: 'top', color: '#f8fafc', fontSize: 12 }
      }
    ]
  };
  myChart.setOption(option);
  return myChart;
};
</script>

<style scoped>
/* 最顶层的绝对遮罩 */
.fullscreen-report-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100vw; height: 100vh;
  z-index: 2147483647;
  background-color: #1e293b;
  overflow-y: auto;
}

.report-page-container {
  min-height: 100vh;
  padding: 30px 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 40px;
  padding-bottom: 15px;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
}

/* -------------------------------------
   左侧：原生表格布局约束体系
-------------------------------------- */
.table-section {
  flex: 1.2;
  display: flex;
  flex-direction: column;
}

.table-wrapper {
  background: #ffffff; /* 确保黑色边框清晰可见的底层容器 */
  padding: 30px;
  border-radius: 4px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  gap: 40px; /* 两个独立报表之间的呼吸间距 */
}

.native-table-container {
  width: 100%;
}

.table-title {
  text-align: center;
  color: #000000;
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 15px 0;
  letter-spacing: 1px;
}

/* 核心原生表格样式：全量黑边框，绝对居中 */
.native-table {
  width: 100%;
  border-collapse: collapse; /* 经典单元格边框合并 */
  table-layout: fixed; /* 强制等比均分 12 列表宽 */
}

.native-table th,
.native-table td {
  border: 2px solid #000000; /* 全量黑边框加持 */
  text-align: center;
  vertical-align: middle;
  padding: 14px 8px;
  color: #000000;
  font-size: 14px;
}

.native-table th {
  background-color: #f1f5f9; /* 表头浅灰以提升层级感 */
  font-weight: bold;
}

.native-table td {
  background-color: #ffffff;
}

/* -------------------------------------
   右侧：图表布局约束体系
-------------------------------------- */
.chart-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 40px;
}

.chart-box {
  width: 100%;
  flex: 1;
  min-height: 280px;
}
</style>
