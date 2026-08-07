import { RequestPayload } from '../types';

export const WAREHOUSE_DATA_STATS_URL = '/PRO/ProductionCount/GetProjectWarehouseDataStatistics';
export const PLM_PROJECT_ENTITIES_URL = 'https://integ-plat-proj-api.bimtk.com/PLM/Plm_Projects/GetEntities';

export const GET_USER_ENTITY_URL = '/Platform/User/GetUserEntity';

export const DEFAULT_REQUEST_PAYLOAD: RequestPayload = {
  Page: 1,
  PageSize: -1
};

export const MONTHLY_FACTORY_OUTPUT = 'https://integ-plat-produce-api.bimtk.com/PRO/ProductionCount/MonthlyFactoyOutput';
