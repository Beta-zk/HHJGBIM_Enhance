import { API_URLS } from '../config/constants';
import { GMHttpClient } from '../core/GMHttpClient';
import { authService } from './AuthService';

/**
 * @interface ISchdulingOptionalParams
 * @description 排产查询可选参数，高度解耦特定条件过滤机制。
 */
export interface ISchdulingOptionalParams {
    Project_Id?: string;
    Area_Id?: string;
    InstallUnit_Id?: string;
    Status?: number;
    Workshop_Id?: string;
    Finish_Date_Begin?: string;
    Finish_Date_End?: string;
    Is_New_Schduling?: boolean;
}

/**
 * @interface ISchdulingResult
 * @description 排产综合数据契约，集成构件矩阵与所属项目溯源凭证。
 */
export interface ISchdulingResult {
    compCodes: string[];
    projectName: string;
    projectId: string;
}

/**
 * @class SchdulingService
 * @description 生产排产业务聚合引擎。
 */
class SchdulingService {
    
    /**
     * @method getCompCodesBySchdulingCode
     * @description 通过排产单号，利用多态请求级联获取关联的构件编码数组及项目源信息。
     * @param {string} schdulingCode 非空查询标识
     * @param {ISchdulingOptionalParams} [optionalParams={}] 选填搜索字段
     * @returns {Promise<ISchdulingResult>}
     */
    public async getCompCodesBySchdulingCode(
        schdulingCode: string, 
        optionalParams: ISchdulingOptionalParams = {}
    ): Promise<ISchdulingResult> {
        if (!schdulingCode) {
            throw new Error('[SchdulingService] Schduling_Code 不允许为空');
        }

        await authService.waitForToken();
        
        const pagePayload = {
            Page: 1,
            PageSize: 5000,
            Project_Id: "",
            Area_Id: "",
            InstallUnit_Id: "",
            Status: 1,
            Schduling_Code: schdulingCode,
            Workshop_Id: "",
            Finish_Date_Begin: "",
            Finish_Date_End: "",
            Is_New_Schduling: true,
            ...optionalParams
        };

        const pageRes = await GMHttpClient.post(API_URLS.GET_COMP_SCHDULING_PAGE_LIST, pagePayload);
        
        if (!pageRes || !pageRes.Data || !Array.isArray(pageRes.Data.Data)) {
            throw new Error('[SchdulingService] 排产分页请求失败或结构异常');
        }

        const dataArray = pageRes.Data.Data;
        if (dataArray.length === 0) {
            return { compCodes: [], projectName: '', projectId: '' };
        }

        if (dataArray.length > 1) {
            const isAllMatch = dataArray.every((item: any) => item.Schduling_Code === schdulingCode);
            if (!isAllMatch) {
                throw new Error('[SchdulingService] 数据异常断言：查询列表存在排产标识不一致的数据污染');
            }
        }

        const targetSchdulingId = dataArray[0].Schduling_Id;
        if (!targetSchdulingId) {
            throw new Error('[SchdulingService] 数据穿透异常：无法定位核心 Schduling_Id 节点');
        }

        const detailPayload = { Schduling_Plan_Id: targetSchdulingId };
        const detailRes = await GMHttpClient.post(API_URLS.GET_COMP_SCHDULING_INFO_DETAIL, detailPayload);

        if (!detailRes || !detailRes.Data || !Array.isArray(detailRes.Data.Schduling_Comps)) {
            throw new Error('[SchdulingService] 详情提取请求失败或映射域结构失效');
        }

        const comps = detailRes.Data.Schduling_Comps;
        const compCodes = comps
            .map((comp: any) => comp.Comp_Code)
            .filter((code: any) => typeof code === 'string' && code.trim() !== '');

        const firstComp = comps.length > 0 ? comps[0] : {};
        const projectName = firstComp.Project_Name || '';
        const projectId = firstComp.Project_Id || '';

        return {
            compCodes,
            projectName,
            projectId
        };
    }
}

export const schdulingService = new SchdulingService();
