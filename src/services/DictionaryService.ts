import { PLM_PROJECT_ENTITIES_URL, DEFAULT_REQUEST_PAYLOAD } from '../config/constants';
import { findArrayWithKey, showToast } from '../utils/helpers';
import { PlmEntityItem } from '../types';

declare const GM_xmlhttpRequest: any;

class DictionaryService {
    public statusDictionary = new Map<string, string>();
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    private dictReadyPromiseInstance: Promise<boolean> | null = null;

    public updateHeaders(key: string, value: string): void {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'authorization' || lowerKey === 'last_working_object_id' || lowerKey.includes('tenant') || lowerKey.includes('token')) {
            this.dynamicHeaders[key] = value;
        }
    }

    public ensureDictReady(): Promise<boolean> {
        if (this.dictReadyPromiseInstance) return this.dictReadyPromiseInstance;

        this.dictReadyPromiseInstance = new Promise((resolve) => {
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
                                    if (item && item.Short_Name && item.State_Name !== undefined) {
                                        this.statusDictionary.set(item.Short_Name, item.State_Name);
                                    }
                                });
                                showToast(`✅ 拦截器就绪：已同步 ${this.statusDictionary.size} 条状态字典`);
                            } else {
                                showToast(`⚠️ 拦截器警告：未在C请求中找到数据`, false);
                            }
                        } catch (error) {
                            showToast(`❌ 拦截器异常：C请求响应解析失败`, false);
                        }
                    } else {
                        showToast(`❌ 拦截器异常：C请求被拒绝 (HTTP ${response.status})`, false);
                    }
                    resolve(true);
                },
                onerror: () => {
                    showToast(`❌ 拦截器异常：网络异常或跨域阻止`, false);
                    resolve(true);
                }
            });
        });
        return this.dictReadyPromiseInstance;
    }
}

export const dictionaryService = new DictionaryService();
