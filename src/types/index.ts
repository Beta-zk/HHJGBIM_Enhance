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
