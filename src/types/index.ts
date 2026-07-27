export interface BimProjectItem {
    Project_Name?: string;
    Status_Name?: string | null;
    [key: string]: any;
}

export interface PlmEntityItem {
    Short_Name?: string;
    State_Name?: string;
    [key: string]: any;
}

export interface RequestPayload {
    Page: number;
    PageSize: number;
}
