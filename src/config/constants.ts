import { RequestPayload } from '../types';

export const WAREHOUSE_DATA_STATS_URL = '/PRO/ProductionCount/GetProjectWarehouseDataStatistics';
export const PLM_PROJECT_ENTITIES_URL = 'https://integ-plat-proj-api.bimtk.com/PLM/Plm_Projects/GetEntities';
export const LOGIN_URL = '/Platform/Login/Login';

export const DEFAULT_REQUEST_PAYLOAD: RequestPayload = {
  Page: 1,
  PageSize: -1
};
