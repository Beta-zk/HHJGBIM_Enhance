<template>
  <div v-if="reportStore.show" class="fixed inset-0 w-screen h-screen z-[2147483647] bg-[#1e293b] overflow-hidden">
    <div class="h-screen py-[30px] px-[40px] box-border flex flex-col">
      <div class="mb-[30px] pb-[15px] border-0 border-b border-solid border-slate-700 flex justify-between items-center shrink-0">
        <span class="text-slate-50 font-semibold text-[20px] tracking-[1px]">绩效考核统计视窗</span>
        <div class="flex items-center gap-5">
          <span v-if="reportStore.crawlDate" class="text-slate-400 text-[13px] bg-slate-700/40 py-1.5 px-3 rounded border border-dashed border-slate-600 tracking-[0.5px]">抓取时间: {{ reportStore.crawlDate }}</span>
          <button class="bg-transparent border border-solid border-slate-600 rounded text-slate-400 py-1.5 px-3 text-[14px] cursor-pointer appearance-none outline-none transition-all duration-200 hover:bg-slate-700 hover:text-slate-50 hover:border-slate-50" @click="reportStore.close()">关闭</button>
        </div>
      </div>

      <div class="flex flex-1 gap-[50px] items-stretch min-h-0">
        <div class="flex-[1.5] flex flex-col overflow-y-auto pr-[15px] scrollbar-custom">
          <div class="flex flex-col gap-[50px] pb-[30px]">

            <div class="w-full transition-colors duration-300 p-2.5 rounded-lg hover:bg-slate-700/40 hover:cursor-default" @mouseenter="activeChartType = 'factory'">
              <h3 class="text-center text-slate-50 text-[18px] font-bold m-0 mb-[15px] tracking-[1px]">工厂产量(t)</h3>
              <table class="w-full border-collapse table-fixed bg-transparent text-center align-middle text-[14px] [&_th]:border [&_th]:border-solid [&_th]:border-slate-600 [&_th]:p-[14px_8px] [&_td]:border [&_td]:border-solid [&_td]:border-slate-600 [&_td]:p-[14px_8px] [&_thead_th]:bg-[#1a202c] [&_thead_th]:text-slate-50 [&_thead_th]:font-bold [&_td]:bg-transparent [&_td]:text-[#e2e8f0] [&_tbody_th]:bg-[#2d3748] [&_tbody_th]:text-[#f1f5f9]">
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

            <div class="w-full transition-colors duration-300 p-2.5 rounded-lg hover:bg-slate-700/40 hover:cursor-default" @mouseenter="activeChartType = 'component'">
              <h3 class="text-center text-slate-50 text-[18px] font-bold m-0 mb-[15px] tracking-[1px]">深化重量(t)</h3>
              <table class="w-full border-collapse table-fixed bg-transparent text-center align-middle text-[14px] [&_th]:border [&_th]:border-solid [&_th]:border-slate-600 [&_th]:p-[14px_8px] [&_td]:border [&_td]:border-solid [&_td]:border-slate-600 [&_td]:p-[14px_8px] [&_thead_th]:bg-[#1a202c] [&_thead_th]:text-slate-50 [&_thead_th]:font-bold [&_td]:bg-transparent [&_td]:text-[#e2e8f0] [&_tbody_th]:bg-[#2d3748] [&_tbody_th]:text-[#f1f5f9]">
                <thead>
                  <tr>
                    <th v-for="m in monthNames" :key="'weight-h-' + m">{{ m }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td v-for="(v, index) in compMonthValues" :key="'weight-v-' + index">{{ v }}</td>
                  </tr>
                  <tr>
                    <th colspan="4" class="diagonal-cell h-[50px] !p-0">
                      <span class="absolute top-2 right-[15px] text-[14px] font-bold">时间</span>
                      <span class="absolute bottom-2 left-[15px] text-[14px] font-bold">姓名</span>
                    </th>
                    <th colspan="4">{{ reportStore.personnelMatrix.prevMonth }}</th>
                    <th colspan="4">{{ reportStore.personnelMatrix.currMonth }}</th>
                  </tr>
                  <tr v-for="(person, idx) in reportStore.personnelMatrix.list" :key="'p-' + idx">
                    <td colspan="4">{{ person.name }}</td>
                    <td colspan="4">{{ person.prevWeight }}</td>
                    <td colspan="4">{{ person.currWeight }}</td>
                  </tr>
                  <tr v-if="reportStore.personnelMatrix.list.length === 0">
                    <td colspan="12" class="!text-[#64748b] italic">暂未在偏好设置中配置深化人员名单...</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        <div class="flex-1 flex flex-col">
          <Chart :active-type="activeChartType" :month-names="monthNames" :month-values="currentChartMonthValues"
            :quarter-values="currentChartQuarterValues" :personnel-matrix="reportStore.personnelMatrix"
            :config="currentChartConfig" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import Chart from './Chart.vue';
import { reportStore } from '../store';

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

  reportStore.reportData.forEach(item => {
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

  if (reportStore.componentData && reportStore.componentData.Data && Array.isArray(reportStore.componentData.Data)) {
    reportStore.componentData.Data.forEach((item: any) => {
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
.diagonal-cell {
  position: relative;
  background: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cline x1='0' y1='0' x2='100%25' y2='100%25' stroke='%23475569' stroke-width='1'/%3E%3C/svg%3E") no-repeat center center;
  background-size: 100% 100%;
  box-sizing: border-box;
}
</style>
