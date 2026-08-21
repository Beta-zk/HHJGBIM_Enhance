<template>
  <div class="fixed top-1/2 right-0 -translate-y-1/2 w-[220px] bg-slate-800/95 text-slate-50 rounded-l-lg shadow-[-5px_0_25px_rgba(0,0,0,0.3)] backdrop-blur z-[2147483646] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border border-solid border-r-0 border-slate-700"
       :class="isExpanded ? 'translate-x-0' : 'translate-x-full'">
    
    <div class="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800/95 border border-solid border-r-0 border-slate-700 rounded-l-lg cursor-pointer flex items-center justify-center hover:bg-slate-700" 
         @click="togglePanel">
      <span class="font-mono text-[18px] font-bold text-sky-400">{{ isExpanded ? '>' : '<' }}</span>
    </div>

    <div class="p-4">
      <div class="text-[14px] font-semibold border-0 border-b border-solid border-slate-600 pb-2.5 mb-4 text-center">增强面板</div>
      <div class="flex flex-col gap-2.5">
        <button class="bg-slate-700 text-slate-200 border border-solid border-slate-600 p-2.5 rounded-md cursor-pointer text-[13px] text-left transition-colors appearance-none outline-none hover:bg-slate-600 hover:border-sky-400 hover:text-white disabled:opacity-50 disabled:hover:bg-slate-700 disabled:hover:border-slate-600 disabled:hover:text-slate-200 disabled:cursor-not-allowed" 
                @click="handleOpenReport" :disabled="isLoading">
          {{ isLoading ? '⏳ 数据拉取中...' : '📊 打开绩效统计表' }}
        </button>
        <button class="bg-slate-700 text-slate-200 border border-solid border-slate-600 p-2.5 rounded-md cursor-pointer text-[13px] text-left transition-colors appearance-none outline-none hover:bg-slate-600 hover:border-sky-400 hover:text-white" 
                @click="showSettings = true">
          ⚙️ 偏好设置
        </button>
        <button class="bg-slate-700 text-slate-200 border border-dashed border-slate-600 p-2.5 rounded-md cursor-not-allowed text-[13px] text-left opacity-50 appearance-none outline-none" disabled>
          🚧 预留
        </button>
      </div>
    </div>
  </div>

  <PerformanceReport v-if="showReport" :raw-data="reportData" :component-data="reportComponentData"
    :personnel-matrix="personnelReportData" :crawl-date="reportCrawlDate" @close="showReport = false" />

  <Settings v-if="showSettings" @close="showSettings = false" />
  
  <!-- 全局插件组件动态装配区（沙箱映射） -->
  <component v-for="[id, comp] in uiStore.activeComponents" :is="comp" :key="id" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { factoryService } from '../services/FactoryService';
import { componentService } from '../services/ComponentService';
import { systemService } from '../services/SystemService';
import { settings } from '../config/settings';
import { showToast } from '../utils/helpers';
import { uiStore } from '../kernel/uiStore';
import type { FactoryMonthItem, PersonnelMatrix, PersonnelWeight } from '../types';
import PerformanceReport from './components/PerformanceReport.vue';
import Settings from './components/Settings.vue';

const isExpanded = ref(false);
const isLoading = ref(false);
const showReport = ref(false);
const showSettings = ref(false);
const reportData = ref<FactoryMonthItem[]>([]);
const reportComponentData = ref<any>(null);
const reportCrawlDate = ref<string>('');

const personnelReportData = ref<PersonnelMatrix>({ currMonth: '', prevMonth: '', list: [] });

const togglePanel = () => { isExpanded.value = !isExpanded.value; };

const formatDateTime = (isoStr: string): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const handleOpenReport = async () => {
  isLoading.value = true;
  try {
    const now = new Date();
    const currMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const userConfig = settings.get();
    const personnelList = userConfig.deepeningPersonnel
      ? userConfig.deepeningPersonnel.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const pingRes = await systemService.ping().catch(() => null);
    const isLocalReady = !!pingRes;

    if (!isLocalReady) {
        console.warn('[UI] 爬虫微服务离线');
    }

    const [factoryRes, compRes, sysReportRes] = await Promise.all([
      factoryService.fetchMonthlyOutput(undefined, isLocalReady).catch(() => null),
      isLocalReady ? componentService.getYearWeight().catch(() => null) : Promise.resolve(null),
      isLocalReady ? systemService.submitSystemReport().catch(() => null) : Promise.resolve(null)
    ]);

    const extractedPersonnelData: PersonnelWeight[] = [];
    
    if (isLocalReady) {
        for (const person of personnelList) {
          const [currData, prevData] = await Promise.all([
            componentService.getMonthWeight(currMonthStr, person).catch(() => null),
            componentService.getMonthWeight(prevMonthStr, person).catch(() => null)
          ]);

          extractedPersonnelData.push({
            name: person,
            currWeight: Number(((currData?.GrossTotal || 0) / 1000).toFixed(3)),
            prevWeight: Number(((prevData?.GrossTotal || 0) / 1000).toFixed(3))
          });
        }
    }

    let validFactoryData = null;
    if (factoryRes) {
      if (factoryRes.StatusCode === 200 && factoryRes.IsSucceed && factoryRes.Data) {
        validFactoryData = factoryRes.Data;
      } else if (!factoryRes.StatusCode && Array.isArray(factoryRes)) {
        validFactoryData = factoryRes;
      } else if (!factoryRes.StatusCode && factoryRes.Data && Array.isArray(factoryRes.Data)) {
        validFactoryData = factoryRes.Data;
      }
    }

    if (validFactoryData && Array.isArray(validFactoryData)) {
      reportData.value = validFactoryData as FactoryMonthItem[];
      reportComponentData.value = compRes;

      let extractedDate = '';
      if (sysReportRes) {
        const sysDataObj = sysReportRes.data || sysReportRes.Data || sysReportRes;
        if (sysDataObj.CrawlDate) {
          extractedDate = sysDataObj.CrawlDate;
        } else if (sysDataObj.crawl_date) {
          extractedDate = sysDataObj.crawl_date;
        }
      }
      reportCrawlDate.value = formatDateTime(extractedDate);

      personnelReportData.value = {
        currMonth: currMonthStr,
        prevMonth: prevMonthStr,
        list: extractedPersonnelData
      };
      showReport.value = true;
      isExpanded.value = false;
    } else {
      showToast('核心工厂数据接口返回异常或无数据', false);
    }
  } catch (error) {
    showToast('网络请求彻底熔断', false);
  } finally {
    isLoading.value = false;
  }
};
</script>
