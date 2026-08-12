<template>
    <div class="chart-container">
        <div ref="monthChartRef" class="chart-box"></div>
        <div ref="quarterChartRef" class="chart-box"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{
    activeType: 'factory' | 'component';
    monthNames: string[];
    monthValues: number[];
    quarterValues: number[];
    personnelMatrix: any;
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

const initCharts = () => {
    if (!monthChartInstance && monthChartRef.value) {
        monthChartInstance = echarts.init(monthChartRef.value);
    }
    if (!quarterChartInstance && quarterChartRef.value) {
        quarterChartInstance = echarts.init(quarterChartRef.value);
    }

    const commonGrid = { left: '3%', right: '3%', bottom: '5%', top: '20%', containLabel: true };
    const commonYAxis = { type: 'value', splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }, axisLabel: { color: '#94a3b8' } };

    // 【修正点】：关闭 smooth 属性，使用直线连接
    monthChartInstance?.setOption({
        title: { text: props.config.monthTitle, left: 'center', textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis' },
        grid: commonGrid,
        xAxis: { type: 'category', data: props.monthNames, axisLabel: { color: '#94a3b8', interval: 0 }, axisTick: { alignWithLabel: true } },
        yAxis: commonYAxis,
        series: [{
            data: props.monthValues, type: 'line', smooth: false, symbolSize: 8,
            lineStyle: { width: 3, color: props.config.monthColor },
            itemStyle: { color: props.config.monthColor },
            label: { show: true, position: 'top', color: '#f8fafc', fontSize: 12 }
        }]
    }, true);

    if (props.activeType === 'factory') {
        // 【修正点】：工厂季度产量关闭 smooth 属性
        quarterChartInstance?.setOption({
            title: { text: props.config.quarterTitle, left: 'center', textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' } },
            tooltip: { trigger: 'axis' },
            grid: commonGrid,
            xAxis: { type: 'category', data: ['一季度', '二季度', '三季度', '四季度'], axisLabel: { color: '#94a3b8', interval: 0 } },
            yAxis: commonYAxis,
            series: [{
                data: props.quarterValues, type: 'line', smooth: false, symbolSize: 8,
                lineStyle: { width: 3, color: props.config.quarterColor },
                itemStyle: { color: props.config.quarterColor },
                label: { show: true, position: 'top', color: '#f8fafc', fontSize: 12 }
            }]
        }, true);
    } else {
        // 【修正点】：个人深化趋势同步关闭 smooth 属性，保持 UI 统一
        const personList = props.personnelMatrix?.list || [];
        const seriesData = personList.map((p: any) => ({
            name: p.name,
            type: 'line',
            smooth: false,
            symbolSize: 8,
            lineStyle: { width: 3 },
            label: { show: true, position: 'top', fontSize: 12 },
            data: [p.prevWeight, p.currWeight]
        }));

        quarterChartInstance?.setOption({
            title: { text: props.config.quarterTitle, left: 'center', textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' } },
            tooltip: { trigger: 'axis' },
            legend: { top: '8%', textStyle: { color: '#94a3b8' } },
            grid: { ...commonGrid, top: '25%' },
            xAxis: { type: 'category', data: [props.personnelMatrix.prevMonth, props.personnelMatrix.currMonth], axisLabel: { color: '#94a3b8' } },
            yAxis: commonYAxis,
            series: seriesData
        }, true);
    }
};

watch(() => [props.monthValues, props.config, props.activeType], async () => {
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
/* 继承 Chart.vue 原有样式 */
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
