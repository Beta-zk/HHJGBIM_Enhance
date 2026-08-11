/**
 * @constant API_URLS
 * @description 全局 API 端点注册表
 */
export const API_URLS = {
    LOGIN: 'https://integ-plat-api.bimtk.com/Platform/Login/Login',
    OUT_LOGIN: 'https://integ-plat-api.bimtk.com/Platform/Login/OutLogin',
    WAREHOUSE_DATA_STATS: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/GetProjectWarehouseDataStatistics',
    PLM_PROJECT_ENTITIES: 'https://integ-plat-proj-api.bimtk.com/PLM/Plm_Projects/GetEntities',
    MONTHLY_FACTORY_OUTPUT: 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/MonthlyFactoyOutput',
    COMPONENT_IMPORT: 'https://integ-plat-produce-api.bimtk.com/PRO/Component/GetComponentImportDetailPageList',
    LOCAL_PROJECT_INFO: 'http://127.0.0.1:8000/project/info',
    LOCAL_COMPONENT_WEIGHT: 'http://127.0.0.1:8000/component/yearWeight'
};
