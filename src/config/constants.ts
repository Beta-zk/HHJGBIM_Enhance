/**
 * @constant API_URLS
 * @description 全局 API 端点注册表
 */
export const API_URLS = {
    // 宿主线上服务 (维持绝对路径)
    LOGIN: 'https://integ-plat-api.bimtk.com/Platform/Login/Login',
    OUT_LOGIN: 'https://integ-plat-api.bimtk.com/Platform/Login/OutLogin',
    WAREHOUSE_DATA_STATS: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/GetProjectWarehouseDataStatistics',
    PLM_PROJECT_ENTITIES: 'https://integ-plat-proj-api.bimtk.com/PLM/Plm_Projects/GetEntities',
    MONTHLY_FACTORY_OUTPUT: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/MonthlyFactoyOutput',
    COMPONENT_IMPORT: 'https://integ-plat-produce-api.bimtk.com/PRO/Component/GetComponentImportDetailPageList',
    
    // 爬虫微服务 (转化为相对路径，配合 settings.ts 动态拼接)
    LOCAL_PROJECT_INFO_PATH: '/project/info',
    LOCAL_COMPONENT_WEIGHT_PATH: '/component/yearWeight',
    
    // [新增] 爬虫系统级探针与初始化路由
    LOCAL_SYSTEM_PING_PATH: '/system/ping',
    LOCAL_SYSTEM_INT_PATH: '/system/int'
};
