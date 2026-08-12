/**
 * @interface BimProjectItem
 * @description 仓储服务标准项目实体契约。
 */
export interface BimProjectItem {
    Project_Name?: string;
    State_Name?: string | null;
    [key: string]: any;
}

/**
 * @interface PlmEntityItem
 * @description PLM 微服务实体数据契约。
 */
export interface PlmEntityItem {
    Short_Name?: string;
    State_Name?: string;
    [key: string]: any;
}
