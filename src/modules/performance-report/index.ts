import { factoryService } from '../../services/FactoryService';
import { componentService } from '../../services/ComponentService';
import { systemService } from '../../services/SystemService';
import { settings } from '../../config/settings';
import { showToast } from '../../utils/helpers';
import { PANEL_SORT_DEFAULT } from '../../config/constants';
import type { IEnhanceModule, ModuleContext } from '../../kernel/module.types';
import type { FactoryMonthItem, PersonnelWeight } from '../../types';
import { reportStore } from './store';
import PerformanceReport from './view/PerformanceReport.vue';

/**
 * @class PerformanceReportEnhance
 * @description 绩效考核统计视窗模块。独占一个全屏视口，聚合工厂产量、构件深化重量与人员绩效矩阵数据，
 * 通过 panelEntry 声明挂载至全局 Shell 面板（排序码 PANEL_SORT_DEFAULT），
 * 数据编排逻辑（原 App.vue handleOpenReport）整体迁入本类，视图经 reportStore 驱动，实现逻辑与视图闭环。
 */
class PerformanceReportEnhance implements IEnhanceModule {
    public readonly id = 'performance-report';
    public readonly title = '绩效考核统计视窗';
    public readonly description = '聚合工厂产量、深化重量与人员绩效矩阵，渲染全屏绩效考核统计视窗。';
    public readonly defaultEnabled = true;
    public readonly component = PerformanceReport;

    public readonly panelEntry = {
        label: '打开绩效统计表',
        icon: '📊',
        sort: PANEL_SORT_DEFAULT,
        text: () => reportStore.isLoading ? '⏳ 数据拉取中...' : '📊 打开绩效统计表',
        disabled: () => reportStore.isLoading,
        action: () => this.openReport()
    };

    public init(_ctx: ModuleContext): void {
        // 绩效视窗为自持视口模块，无宿主 DOM 增强
    }

    /**
     * @method formatDateTime
     * @description 将 ISO 时间字符串格式化为本地可读时间。
     * @param {string} isoStr ISO 时间字符串
     * @returns {string} 格式化后的时间文本
     */
    private formatDateTime(isoStr: string): string {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    /**
     * @method openReport
     * @description 拉取绩效报表全量数据（工厂月度产量 + 构件年度/月度重量 + 系统报表抓取时间），
     * 成功后写入 reportStore 并打开视窗；核心数据异常时输出错误提示。
     * @returns {Promise<void>}
     */
    public async openReport(): Promise<void> {
        reportStore.isLoading = true;
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
                console.warn('[PerformanceReport] 爬虫微服务离线');
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
                reportStore.reportData = validFactoryData as FactoryMonthItem[];
                reportStore.componentData = compRes;

                let extractedDate = '';
                if (sysReportRes) {
                    const sysDataObj = sysReportRes.data || sysReportRes.Data || sysReportRes;
                    if (sysDataObj.CrawlDate) {
                        extractedDate = sysDataObj.CrawlDate;
                    } else if (sysDataObj.crawl_date) {
                        extractedDate = sysDataObj.crawl_date;
                    }
                }
                reportStore.crawlDate = this.formatDateTime(extractedDate);

                reportStore.personnelMatrix = {
                    currMonth: currMonthStr,
                    prevMonth: prevMonthStr,
                    list: extractedPersonnelData
                };
                reportStore.open();
            } else {
                showToast('核心工厂数据接口返回异常或无数据', false);
            }
        } catch {
            showToast('网络请求彻底熔断', false);
        } finally {
            reportStore.isLoading = false;
        }
    }
}

export const performanceReportEnhance = new PerformanceReportEnhance();
