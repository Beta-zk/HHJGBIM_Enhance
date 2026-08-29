<template>
    <div class="flex flex-col justify-evenly h-full gap-10">
        <div ref="monthChartRef" class="w-full flex-1 min-h-[280px]"></div>
        <div ref="quarterChartRef" class="w-full flex-1 min-h-[280px]"></div>
    </div>
</template>

<script setup lang="ts">
/**
 * @module BaseChartRenderer
 * @description ECharts 渲染器封装组件。管控画布实例生命周期，基于 Props 的响应式变更自动实施重绘，支持折线图与双饼图平滑切换。
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import type { PersonnelMatrix, PersonnelWeight } from '../../../types';

const props = defineProps<{
    activeType: 'factory' | 'component';
    monthNames: string[];
    monthValues: number[];
    quarterValues: number[];
    personnelMatrix: PersonnelMatrix;
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
 * @description 图表状态机构造器。注入主题配置，基于工厂/构件特征动态装载对应的坐标系折线图或空间占比饼图，通过 notMerge=true 清理残影。
 * @returns {void}
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
        const personList = props.personnelMatrix?.list || [];

        const prevMonthData = personList.map((p: PersonnelWeight) => ({
            name: p.name,
            value: p.prevWeight
        }));

        const currMonthData = personList.map((p: PersonnelWeight) => ({
            name: p.name,
            value: p.currWeight
        }));

        quarterChartInstance?.setOption({
            title: [
                { text: props.config.quarterTitle, left: 'center', textStyle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' } },
                { text: props.personnelMatrix.prevMonth, left: '25%', top: '15%', textAlign: 'center', textStyle: { color: '#94a3b8', fontSize: 14 } },
                { text: props.personnelMatrix.currMonth, left: '75%', top: '15%', textAlign: 'center', textStyle: { color: '#94a3b8', fontSize: 14 } }
            ],
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const roundedVal = Math.round(params.value || 0);
                    return `${params.seriesName} <br/>${params.name} : ${roundedVal}t<br/>${params.percent}%`;
                }
            },
            legend: {
                bottom: '0%',
                textStyle: { color: '#94a3b8' }
            },
            series: [
                {
                    name: props.personnelMatrix.prevMonth,
                    type: 'pie',
                    radius: '35%',
                    center: ['28%', '55%'],
                    data: prevMonthData,
                    label: {
                        show: true,
                        formatter: (params: any) => {
                            const roundedVal = Math.round(params.value || 0);
                            return `${params.name}\n${roundedVal}t\n${params.percent}%`;
                        },
                        color: '#f8fafc',
                        fontSize: 11
                    },
                    itemStyle: {
                        borderColor: '#1e293b',
                        borderWidth: 2
                    }
                },
                {
                    name: props.personnelMatrix.currMonth,
                    type: 'pie',
                    radius: '35%',
                    center: ['72%', '55%'],
                    data: currMonthData,
                    label: {
                        show: true,
                        formatter: (params: any) => {
                            const roundedVal = Math.round(params.value || 0);
                            return `${params.name}\n${roundedVal}t\n${params.percent}%`;
                        },
                        color: '#f8fafc',
                        fontSize: 11
                    },
                    itemStyle: {
                        borderColor: '#1e293b',
                        borderWidth: 2
                    }
                }
            ]
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
