<template>
  <div class="modal-overlay">
    <div class="modal-window">
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <span class="title">工厂产量统计视窗</span>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <!-- 弹窗主体区 (弹性布局体系) -->
      <div class="modal-body">
        <div v-if="loading" class="status-msg">⏳ 正在拉取工厂数据并构建图表...</div>
        <div v-else-if="errorMsg" class="status-msg error">{{ errorMsg }}</div>
        
        <!-- 核心图表容器：确保 DOM 渲染就绪后再挂载 -->
        <div v-if="!loading && !errorMsg" class="charts-container">
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
import { factoryService } from '../../services/FactoryService';

const emit = defineEmits(['close']);

const loading = ref(true);
const errorMsg = ref('');

const monthChartRef = ref<HTMLElement | null>(null);
const quarterChartRef = ref<HTMLElement | null>(null);

let monthChartInstance: echarts.ECharts | null = null;
let quarterChartInstance: echarts.ECharts | null = null;

interface MonthlyData {
  Name: string;
  Value: number | null;
}
interface ApiResponse {
  Data: MonthlyData[];
  IsSucceed: boolean;
  StatusCode: number;
}

// 字典：原始数字向中文语义映射
const monthMap: Record<string, string> = {
  '1': '一月', '2': '二月', '3': '三月', '4': '四月', 
  '5': '五月', '6': '六月', '7': '七月', '8': '八月', 
  '9': '九月', '10': '十月', '11': '十一月', '12': '十二月'
};
const quarterLabels = ['一季度', '二季度', '三季度', '四季度'];

onMounted(async () => {
  try {
    const res = await factoryService.fetchMonthlyOutput() as ApiResponse;
    
    if (res && res.StatusCode === 200 && res.IsSucceed && res.Data) {
      loading.value = false; 
      await nextTick();      
      renderCharts(res.Data);
    } else {
      errorMsg.value = '接口返回异常或无数据';
      loading.value = false;
    }
  } catch (error) {
    errorMsg.value = '网络请求失败';
    loading.value = false;
  }

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

const renderCharts = (rawData: MonthlyData[]) => {
  const monthNames: string[] = [];
  const monthValues: number[] = [];
  const quarterValues = [0, 0, 0, 0];

  rawData.forEach(item => {
    const val = item.Value || 0;
    const monthInt = parseInt(item.Name, 10);
    
    // 中文语义化赋值
    monthNames.push(monthMap[item.Name] || `${item.Name}月`);
    monthValues.push(val);

    // 季度累加聚合
    if (monthInt >= 1 && monthInt <= 3) quarterValues[0] += val;
    else if (monthInt >= 4 && monthInt <= 6) quarterValues[1] += val;
    else if (monthInt >= 7 && monthInt <= 9) quarterValues[2] += val;
    else if (monthInt >= 10 && monthInt <= 12) quarterValues[3] += val;
  });

  // 规避 JS 浮点累加误差
  const formattedQuarterValues = quarterValues.map(v => Number(v.toFixed(3)));

  monthChartInstance = initChart(monthChartRef.value, '月度产量', monthNames, monthValues, '#38bdf8');
  quarterChartInstance = initChart(quarterChartRef.value, '季度产量', quarterLabels, formattedQuarterValues, '#10b981');
};

const initChart = (dom: HTMLElement | null, title: string, xAxisData: string[], seriesData: number[], color: string) => {
  if (!dom) return null;
  const myChart = echarts.init(dom);
  const option = {
    title: { 
      text: title, 
      left: 'center', // 标题全局居中
      textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    // 强制图表横向延展，保留 3% 左右的安全空隙
    grid: { 
      left: '3%', 
      right: '3%', 
      bottom: '5%', 
      top: '20%',
      containLabel: true 
    },
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
        barWidth: '25%', // 控制柱体粗细，避免铺满时过于臃肿
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
/* 模态框遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
}

/* 模态框主体：占用 70vw 极宽视野 */
.modal-window {
  width: 70vw; 
  min-width: 800px; /* 保底宽度 */
  height: 75vh;
  min-height: 600px;
  background: #1e293b;
  border-radius: 10px;
  border: 1px solid #334155;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
}

/* 头部样式 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #334155;
}

.modal-header .title {
  color: #f8fafc;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.5px;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}
.close-btn:hover {
  color: #ef4444;
}

/* 弹窗主体区：引入弹性计算结构 */
.modal-body {
  flex: 1; /* 继承剩余可用高度 */
  display: flex;
  flex-direction: column;
  padding: 40px; /* 图表与容器四周边缘保留大量呼吸感空隙 */
}

.status-msg {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 15px;
}
.status-msg.error {
  color: #f87171;
}

/* 图表阵列布局：垂直居中及宽大间隔 */
.charts-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly; /* 上下图表在空间内均匀铺开 */
  gap: 50px; /* 两幅图之间的强力隔离带 */
  width: 100%;
}

.chart-box {
  width: 100%;
  flex: 1; /* 图表高度自适应均分 */
  min-height: 250px;
}
</style>
