import { PLM_PROJECT_ENTITIES_URL, DEFAULT_REQUEST_PAYLOAD } from '../config/constants';
import { findArrayWithKey, showToast } from '../utils/helpers';
import { PlmEntityItem } from '../types';

declare const GM_xmlhttpRequest: any;

class ProjectStateService {
    public projectStateMap = new Map<string, string>();
    
    public dynamicHeaders: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/plain, */*"
    };
    
    private syncPromiseInstance: Promise<boolean> | null = null;
    private readonly AUTH_STORAGE_KEY = 'HHJG_BIM_AUTH_TOKEN';

    constructor() {
        const savedToken = localStorage.getItem(this.AUTH_STORAGE_KEY);
        if (savedToken) {
            this.dynamicHeaders['Authorization'] = savedToken;
        }
    }

    public setAuthToken(token: string): void {
        if (!token) return;
        this.dynamicHeaders['Authorization'] = token;
        localStorage.setItem(this.AUTH_STORAGE_KEY, token);
        console.log('[HHJGBIM_Enhance] 已成功提取并持久化 Authorization 令牌');
    }

    public updateHeaders(key: string, value: string): void {
        const lowerKey = key.toLowerCase();
        
        // 核心修复：移除防御性判断，强制覆写最新 Token 并同步至本地存储
        if (lowerKey === 'authorization') {
            if (this.dynamicHeaders['Authorization'] !== value) {
                this.dynamicHeaders['Authorization'] = value;
                localStorage.setItem(this.AUTH_STORAGE_KEY, value);
            }
            return;
        }

        // 扩充泛型嗅探：捕获所有可能存在的业务级定制 Header
        if (
            lowerKey === 'last_working_object_id' || 
            lowerKey.includes('tenant') || 
            lowerKey.includes('token') || 
            lowerKey.startsWith('x-')
        ) {
            this.dynamicHeaders[key] = value;
        }
    }

    public ensureProjectStateSynced(): Promise<boolean> {
        if (this.syncPromiseInstance) return this.syncPromiseInstance;

        this.syncPromiseInstance = new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: PLM_PROJECT_ENTITIES_URL,
                headers: this.dynamicHeaders,
                data: JSON.stringify(DEFAULT_REQUEST_PAYLOAD),
                withCredentials: true,
                onload: (response: any) => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const json = JSON.parse(response.responseText);
                            
                            // 针对业务状态码 401（Token 失效）的专项拦截与释放机制
                            if (json && json.StatusCode === 401) {
                                console.warn('[HHJGBIM_Enhance] 服务端拒载：Token 已过期或无效。正在重置状态机...');
                                localStorage.removeItem(this.AUTH_STORAGE_KEY);
                                this.syncPromiseInstance = null; // 释放锁，允许下次请求重新发起
                                showToast(`⚠️ 鉴权已过期，脚本将在您下次操作时重新尝试拦截凭证`, false);
                                resolve(true);
                                return;
                            }

                            const items = findArrayWithKey(json, 'Short_Name') || findArrayWithKey(json, 'Project_Name');

                            if (items && items.length > 0) {
                                items.forEach(item => {
                                    const keyName = item?.Short_Name || item?.Project_Name;
                                    if (keyName && item.State_Name !== undefined) {
                                        this.projectStateMap.set(keyName, item.State_Name);
                                    }
                                });
                                showToast(`✅ 已同步 ${this.projectStateMap.size} 条项目状态`);
                            } else {
                                console.warn('[HHJGBIM_Enhance] HTTP 200 但无有效数据。当前动态 Header 集合:', this.dynamicHeaders);
                                console.warn('[HHJGBIM_Enhance] 接口实际响应报文溯源:', json);
                                showToast(`⚠️ 未找到有效的项目状态数据，请按 F12 查看控制台详细报文`, false);
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

export const projectStateService = new ProjectStateService();
