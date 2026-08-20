/**
 * @constant API_URLS
 * @description 系统级路由注册中心。统一管理宿主平台绝对寻址与本地爬虫微服务相对寻址，支撑网络层的流量分发。
 * 使用 as const 固化字面量类型，key 拼写错误将在编译期暴露。
 */
export const API_URLS = {
    WAREHOUSE_DATA_STATS: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/GetProjectWarehouseDataStatistics',
    PLM_PROJECT_ENTITIES: 'https://integ-plat-proj-api.bimtk.com/PLM/Plm_Projects/GetEntities',
    MONTHLY_FACTORY_OUTPUT: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/MonthlyFactoyOutput',
    LOCAL_PROJECT_INFO_PATH: '/project/info',
    LOCAL_COMPONENT_WEIGHT_PATH: '/component/yearWeight',
    LOCAL_COMPONENT_MONTH_WEIGHT_PATH: '/component/monthWeight',
    LOCAL_SYSTEM_PING_PATH: '/system/ping',
    LOCAL_SYSTEM_INT_PATH: '/system/int',
    LOCAL_SYSTEM_PROGRESS_PATH: '/system/progress',
    LOCAL_SYSTEM_REPORT_PATH: '/system/report',
    LOCAL_FACTORY_YEAR_OUTPUT_PATH: '/factory/yearOutput',
    GET_COMP_SCHDULING_PAGE_LIST: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionSchduling/GetCompSchdulingPageList',
    GET_COMP_SCHDULING_INFO_DETAIL: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionSchduling/GetCompSchdulingInfoDetail',
    GET_RAW_WH_SUMMARY_LIST: 'https://integ-plat-produce-api.bimtk.com/PRO/MaterielInventory/GetRawWHSummaryList'
} as const;
