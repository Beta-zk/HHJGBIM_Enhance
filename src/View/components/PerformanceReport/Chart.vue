<template>
    <div class="chart-container">
        <div ref="monthChartRef" class="chart-box"></div>
        <div ref="quarterChartRef" class="chart-box"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';

/**
 * @interface ChartGroupProps
 * @description 通用图表组数据与主题配置规范
 */
const props = defineProps<{
    monthNames: string[];
    monthValues: number[];
    quarterValues: number[];
    // 主题与文案动态配置槽
    config: {
        monthTitle: string;
        quarterTitle: string;
        monthColor: string;
        quarterColor: string;
    };
}>();

const monthChartRef = ref<HTMLDivElement | null>(null);
const quarterChartRef = ref<HTMLDivElement | null>(null);

let monthChartInstance: echarts.ECharts | null = null;
let quarterChartInstance: echarts.ECharts | null = null;

/**
 * @method initCharts
 * @description 根据注入的 Props 挂载/重绘图表实例
 */
const initCharts = () => {
    if (!monthChartInstance && monthChartRef.value) {
        monthChartInstance = echarts.init(monthChartRef.value);
    }
    if (!quarterChartInstance && quarterChartRef.value) {
        quarterChartInstance = echarts.init(quarterChartRef.value);
    }

    const commonGrid = { left: '3%', right: '3%', bottom: '5%', top: '20%', containLabel: true };
    const commonYAxis = { type: 'value', splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }, axisLabel: { color: '#94a3b8' } };

    monthChartInstance?.setOption({
        title: { text: props.config.monthTitle, left: 'center', textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: commonGrid,
        xAxis: { type: 'category', data: props.monthNames, axisLabel: { color: '#94a3b8', interval: 0 }, axisTick: { alignWithLabel: true } },
        yAxis: commonYAxis,
        series: [{
            data: props.monthValues, type: 'bar', barWidth: '25%',
            itemStyle: { borderRadius: [4, 4, 0, 0], color: props.config.monthColor },
            label: { show: true, position: 'top', color: '#f8fafc', fontSize: 12 }
        }]
    });

    quarterChartInstance?.setOption({
        title: { text: props.config.quarterTitle, left: 'center', textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: commonGrid,
        xAxis: { type: 'category', data: ['一季度', '二季度', '三季度', '四季度'], axisLabel: { color: '#94a3b8', interval: 0 }, axisTick: { alignWithLabel: true } },
        yAxis: commonYAxis,
        series: [{
            data: props.quarterValues, type: 'bar', barWidth: '25%',
            itemStyle: { borderRadius: [4, 4, 0, 0], color: props.config.quarterColor },
            label: { show: true, position: 'top', color: '#f8fafc', fontSize: 12 }
        }]
    });
};

watch(() => [props.monthValues, props.config], async () => {
    await nextTick();
    initCharts();
}, { deep: true });

const handleResize = () => {
    monthChartInstance?.resize();
    quarterChartInstance?.resize();
};

onMounted(async () => {
    await nextTick();
    initCharts();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    monthChartInstance?.dispose();
    quarterChartInstance?.dispose();
});
</script>

<style scoped>
.chart-container {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    height: 100%;
    gap: 40px;
}

.chart-box {
    width: 100%;
    flex: 1;
    min-height: 280px;
}
</style>
