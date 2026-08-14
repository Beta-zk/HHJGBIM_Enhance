/**
 * @constant API_URLS
 * @description 系统级路由注册中心。统一管理宿主平台绝对寻址与本地爬虫微服务相对寻址，支撑网络层的流量分发。
 */
export const API_URLS = {
    LOGIN: 'https://integ-plat-api.bimtk.com/Platform/Login/Login',
    OUT_LOGIN: 'https://integ-plat-api.bimtk.com/Platform/Login/OutLogin',
    WAREHOUSE_DATA_STATS: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/GetProjectWarehouseDataStatistics',
    PLM_PROJECT_ENTITIES: 'https://integ-plat-proj-api.bimtk.com/PLM/Plm_Projects/GetEntities',
    MONTHLY_FACTORY_OUTPUT: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/MonthlyFactoyOutput',
    LOCAL_PROJECT_INFO_PATH: '/project/info',
    LOCAL_COMPONENT_WEIGHT_PATH: '/component/yearWeight',
    LOCAL_COMPONENT_MONTH_WEIGHT_PATH: '/component/monthWeight',
    LOCAL_SYSTEM_PING_PATH: '/system/ping',
    LOCAL_SYSTEM_INT_PATH: '/system/int',
    LOCAL_SYSTEM_REPORT_PATH: '/system/report',
    LOCAL_FACTORY_YEAR_OUTPUT_PATH: '/factory/yearOutput'
};
