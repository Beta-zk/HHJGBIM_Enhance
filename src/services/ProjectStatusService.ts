import { PLM_PROJECT_ENTITIES_URL, DEFAULT_REQUEST_PAYLOAD } from '../config/constants';
import { findArrayWithKey, showToast } from '../utils/helpers';
import { PlmEntityItem } from '../types';

declare const GM_xmlhttpRequest: any;

class ProjectStatusService {

    public projectStatusMap = new Map<string, string>();
    
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    
    private syncPromiseInstance: Promise<boolean> | null = null;

    public updateHeaders(key: string, value: string): void {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'authorization' || lowerKey === 'last_working_object_id' || lowerKey.includes('tenant') || lowerKey.includes('token')) {
            this.dynamicHeaders[key] = value;
        }
    }

    public ensureProjectStatusSynced(): Promise<boolean> {
        if (this.syncPromiseInstance) return this.syncPromiseInstance;

        this.syncPromiseInstance = new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: PLM_PROJECT_ENTITIES_URL,
                headers: this.dynamicHeaders,
                data: JSON.stringify(DEFAULT_REQUEST_PAYLOAD),
                onload: (response: any) => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const json = JSON.parse(response.responseText);
                            const items = findArrayWithKey(json, 'Short_Name') as PlmEntityItem[];

                            if (items && items.length > 0) {
                                items.forEach(item => {
                                    if (item?.Short_Name && item.State_Name !== undefined) {
                                        this.projectStatusMap.set(item.Short_Name, item.State_Name);
                                    }
                                });
                                showToast(`✅ 已同步 ${this.projectStatusMap.size} 条项目状态`);
                            } else {
                                showToast(`⚠️ 未找到有效的项目状态数据`, false);
                            }
                        } catch {
                            showToast(`❌ 项目状态响应解析失败`, false);
                        }
                    } else {
                        showToast(`❌ 项目状态请求失败 (HTTP ${response.status})`, false);
                    }
                    resolve(true);
                },
                onerror: () => {
                    showToast(`❌ 网络异常或跨域受阻`, false);
                    resolve(true);
                }
            });
        });

        return this.syncPromiseInstance;
    }
}

export const projectStatusService = new ProjectStatusService();
