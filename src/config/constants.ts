import { RequestPayload } from '../types';

export const URL_A_TARGET = '/PRO/ProductionCount/GetProjectWarehouseDataStatistics';
export const URL_C_SOURCE = 'https://integ-plat-proj-api.bimtk.com/PLM/Plm_Projects/GetEntities';

export const DEFAULT_REQUEST_PAYLOAD: RequestPayload = {
    Page: 1,
    PageSize: -1
};
