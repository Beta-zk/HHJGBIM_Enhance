/**
 * @interface ApiEnvelope
 * @description 宿主接口统一响应信封。各业务接口在信封的 Data 域内承载具体数据。
 */
export interface ApiEnvelope<T = any> {
    StatusCode?: number;
    IsSucceed?: boolean;
    Data?: T;
    [key: string]: any;
}

/**
 * @interface PageResponse
 * @description 分页响应结构：信封内嵌 Data.Data 数组。
 */
export interface PageResponse<T> {
    Data: {
        Data: T[];
        [key: string]: any;
    };
    [key: string]: any;
}

/**
 * @interface PlmProjectEntity
 * @description PLM 项目实体字典节点（名称/项目名/简称 → 生命周期状态）。
 */
export interface PlmProjectEntity {
    Name?: string;
    Project_Name?: string;
    Short_Name?: string;
    State_Name?: string;
    [key: string]: any;
}

/**
 * @interface RawWhSummaryItem
 * @description 原材料仓汇总节点（Weight 参与过滤与降序重排）。
 */
export interface RawWhSummaryItem {
    Weight?: number | string;
    [key: string]: any;
}

/**
 * @interface FactoryMonthItem
 * @description 工厂月度产量数据元。
 */
export interface FactoryMonthItem {
    Name: string;
    Value: number;
    [key: string]: any;
}

/**
 * @interface PersonnelWeight
 * @description 人员绩效权重节点。
 */
export interface PersonnelWeight {
    name: string;
    currWeight: number;
    prevWeight: number;
}

/**
 * @interface PersonnelMatrix
 * @description 人员绩效矩阵组合。
 */
export interface PersonnelMatrix {
    currMonth: string;
    prevMonth: string;
    list: PersonnelWeight[];
}
