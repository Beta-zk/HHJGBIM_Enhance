import { shallowReactive } from 'vue';
import type { FactoryMonthItem, PersonnelMatrix } from '../../types';

/**
 * @const reportStore
 * @description 绩效考核视窗私有状态。承载报表显隐、数据装载状态与全部报表数据切片，
 * 由 performance-report 模块独占读写，PerformanceReport.vue 只读订阅。
 * 数据流：模块类 openReport() 拉取 → 写入 store → 视图响应式渲染。
 */
export const reportStore = shallowReactive({
    /** 报表窗口是否可见 */
    show: false,
    /** 数据拉取中（面板按钮据此禁用并切换文案） */
    isLoading: false,
    /** 工厂月度产量数据 */
    reportData: [] as FactoryMonthItem[],
    /** 构件年度重量数据（原始响应） */
    componentData: null as any,
    /** 人员绩效矩阵 */
    personnelMatrix: { currMonth: '', prevMonth: '', list: [] } as PersonnelMatrix,
    /** 抓取时间（已格式化） */
    crawlDate: '',

    open() {
        this.show = true;
    },

    close() {
        this.show = false;
    }
});
