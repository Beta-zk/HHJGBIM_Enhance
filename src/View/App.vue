<template>
  <div class="hhjgbim-sidebar" :class="{ 'is-expanded': isExpanded }">
    <div class="toggle-btn" @click="togglePanel">
      <span class="icon">{{ isExpanded ? '>' : '<' }}</span>
    </div>

    <div class="sidebar-content">
      <div class="sidebar-header">🛠️ 增强面板</div>
      <div class="btn-list">
        <button class="action-btn" @click="handleOpenReport" :disabled="isLoading">
          {{ isLoading ? '⏳ 数据拉取中...' : '📊 打开绩效统计表' }}
        </button>
        <button class="action-btn" @click="showSettings = true">
          ⚙️ 偏好设置
        </button>
        <button class="action-btn placeholder" disabled>
          🚧 预留功能模块
        </button>
      </div>
    </div>
  </div>

  <PerformanceReport v-if="showReport" :raw-data="reportData" :component-data="reportComponentData"
    :personnel-matrix="personnelReportData" :crawl-date="reportCrawlDate" @close="showReport = false" />

  <Settings v-if="showSettings" @close="showSettings = false" />
</template>

<script setup lang="ts">
/**
 * @module AppRoot
 * @description 顶层视图控制器。协调侧边栏动画状态，并作为中心枢纽向下级图表与设置组件下发 Props。
 */
import { ref } from 'vue';
import { factoryService } from '../services/FactoryService';
import { componentService } from '../services/ComponentService';
import { systemService } from '../services/SystemService';
import { settings } from '../config/settings';
import PerformanceReport from './components/PerformanceReport.vue';
import Settings from './components/Settings.vue';

const isExpanded = ref(false);
const isLoading = ref(false);
const showReport = ref(false);
const showSettings = ref(false);
const reportData = ref<any[]>([]);
const reportComponentData = ref<any>(null);
const reportCrawlDate = ref<string>('');

const personnelReportData = ref<any>({ currMonth: '', prevMonth: '', list: [] });

const togglePanel = () => { isExpanded.value = !isExpanded.value; };

/**
 * @method formatDateTime
 * @description 时间清洗器。将非标准的 ISO 串清洗为严格的年-月-日 时-分-秒格式。
 * @param {string} isoStr 原始时间戳
 * @returns {string} 标准化输出
 */
const formatDateTime = (isoStr: string): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * @method handleOpenReport
 * @description 异步聚合工厂产量、深化组件权重数据及底层系统报告快照，实施多接口并发请求与异常熔断保护。
 * @returns {Promise<void>}
 */
const handleOpenReport = async () => {
  isLoading.value = true;
  try {
    const now = new Date();
    const currMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const userConfig = settings.get() as any;
    const personnelList = userConfig.deepeningPersonnel
      ? userConfig.deepeningPersonnel.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const [factoryRes, compRes, sysReportRes] = await Promise.all([
      factoryService.fetchMonthlyOutput().catch(() => null),
      componentService.getYearWeight().catch(() => null),
      systemService.submitSystemReport().catch(() => null)
    ]);

    const extractedPersonnelData = [];
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

    if (factoryRes && factoryRes.StatusCode === 200 && factoryRes.IsSucceed && factoryRes.Data) {
      reportData.value = factoryRes.Data;
      reportComponentData.value = compRes;

      // 仅提取目标时间特征，兼容嵌套结构与帕斯卡/小写命名差异，丢弃其余报告数据
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
      alert('核心工厂数据接口返回异常或无数据');
    }
  } catch (error) {
    alert('网络请求彻底熔断');
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* 保持原有样式，未变更 */
.hhjgbim-sidebar {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%) translateX(100%);
  width: 220px;
  background: rgba(30, 41, 59, 0.95);
  color: #f8fafc;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  z-index: 2147483646;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #334155;
  border-right: none;
}

.hhjgbim-sidebar.is-expanded {
  transform: translateY(-50%) translateX(0);
}

.toggle-btn {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid #334155;
  border-right: none;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  background: #334155;
}

.toggle-btn .icon {
  font-family: monospace;
  font-size: 18px;
  font-weight: bold;
  color: #38bdf8;
}

.sidebar-content {
  padding: 16px;
}

.sidebar-header {
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid #475569;
  padding-bottom: 10px;
  margin-bottom: 16px;
  text-align: center;
}

.btn-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}

.action-btn:hover:not(:disabled) {
  background: #475569;
  border-color: #38bdf8;
  color: #fff;
}

.action-btn.placeholder {
  opacity: 0.5;
  cursor: not-allowed;
  border-style: dashed;
}
</style>
