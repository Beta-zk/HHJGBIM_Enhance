import { PLM_PROJECT_ENTITIES_URL, DEFAULT_REQUEST_PAYLOAD } from '../config/constants';
import { findArrayWithKey, showToast } from '../utils/helpers';
import { PlmEntityItem } from '../types';
import { globalAuthManager } from '../store/GlobalAuthManager';

declare const GM_xmlhttpRequest: any;

export class ProjectService {
    // 仅保留 Promise 实例用于防止短时间内重复发起请求
    private static syncPromiseInstance: Promise<PlmEntityItem[]> | null = null;

    /**
     * 完整获取请求信息，返回最原始的目标数组，交由各业务模块自行提取
     */
    public static fetchProjectEntities(): Promise<PlmEntityItem[]> {
        if (this.syncPromiseInstance) return this.syncPromiseInstance;

        this.syncPromiseInstance = new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: PLM_PROJECT_ENTITIES_URL,
                headers: globalAuthManager.getHeaders(),
                data: JSON.stringify(DEFAULT_REQUEST_PAYLOAD),
                onload: (response: any) => {
                    let items: PlmEntityItem[] = [];
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const json = JSON.parse(response.responseText);
                            items = (findArrayWithKey(json, 'Short_Name') as PlmEntityItem[]) || [];
                            if (items.length > 0) {
                                showToast(`✅ 成功获取 ${items.length} 条项目基础信息`);
                            } else {
                                showToast(`⚠️ 未找到有效的项目状态数据`, false);
                            }
                        } catch {
                            showToast(`❌ 项目状态响应解析失败`, false);
                        }
                    } else {
                        showToast(`❌ 项目状态请求失败 (HTTP ${response.status})`, false);
                    }
                    resolve(items);
                },
                onerror: () => {
                    showToast(`❌ 网络异常或跨域受阻`, false);
                    resolve([]);
                }
            });
        });

        return this.syncPromiseInstance;
    }
}
