import { WAREHOUSE_DATA_STATS_URL } from '../config/constants';
// 核心修改：引入重命名后的 service
import { projectStateService } from '../services/ProjectStateService'; 
import { findArrayWithKey } from '../utils/helpers';
import { BimProjectItem } from '../types';

export class ProjectInventoryEnhance {
    private injectTargetData(responseData: any): any {
        try {
            const dataLayer = findArrayWithKey(responseData, 'Project_Name') as BimProjectItem[];
            if (dataLayer && dataLayer.length > 0) {
                let modifiedCount = 0;
                dataLayer.forEach(item => {
                    // 核心修改：替换为 projectStateMap 并赋值给 State_Name
                    if (item && item.Project_Name && projectStateService.projectStateMap.has(item.Project_Name)) {
                        item.State_Name = projectStateService.projectStateMap.get(item.Project_Name)!;
                        modifiedCount++;
                    } else if (item && item.Project_Name && item.State_Name === undefined) {
                        item.State_Name = null;
                    }
                });
                console.log(`[HHJGBIM_Enhance] ‘项目库存统计‘ 请求渲染前拦截成功，已动态注入 ${modifiedCount} 条 State_Name 数据！`);
            }
            return responseData;
        } catch (error) {
            return responseData;
        }
    }

    public init(): void {
        this.hijackXHR();
        this.hijackFetch();
    }

    private hijackXHR(): void {
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
            projectStateService.updateHeaders(header, value);
            return originalSetRequestHeader.apply(this, [header, value]);
        };

        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
            (this as any)._requestUrl = url.toString();
            return originalXHROpen.apply(this, arguments as any);
        };

        const self = this;
        XMLHttpRequest.prototype.send = function(...args: any[]) {
            const url = (this as any)._requestUrl || '';

            this.addEventListener('readystatechange', function() {
                if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
                    if (((this as any)._requestUrl || '').includes(WAREHOUSE_DATA_STATS_URL)) {
                        try {
                            const json = JSON.parse(this.responseText);
                            const modifiedJson = self.injectTargetData(json);
                            Object.defineProperty(this, 'responseText', { get: () => JSON.stringify(modifiedJson) });
                            Object.defineProperty(this, 'response', { get: () => JSON.stringify(modifiedJson) });
                        } catch (e) {}
                    }
                }
            });

            if (url.includes(WAREHOUSE_DATA_STATS_URL)) {
                // 核心修改：调用重命名后的方法 ensureProjectStateSynced
                projectStateService.ensureProjectStateSynced().then(() => { originalXHRSend.apply(this, args as any); });
            } else {
                originalXHRSend.apply(this, args as any);
            }
        };
    }

    private hijackFetch(): void {
        const originalFetch = window.fetch;
        const self = this;
        window.fetch = async function(...args: any[]) {
            const requestUrl = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
            const options = args[1] || {};

            if (options.headers) {
                const h = new Headers(options.headers);
                h.forEach((value, key) => {
                    projectStateService.updateHeaders(key, value);
                });
            }

            if (requestUrl.includes(WAREHOUSE_DATA_STATS_URL)) {
                // 核心修改：调用重命名后的方法 ensureProjectStateSynced
                await projectStateService.ensureProjectStateSynced();
                const response = await originalFetch.apply(this, args as any);
                const cloneRes = response.clone();
                try {
                    const json = await cloneRes.json();
                    const modifiedJson = self.injectTargetData(json);
                    return new Response(JSON.stringify(modifiedJson), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (error) {
                    return response;
                }
            }
            return await originalFetch.apply(this, args as any);
        };
    }
}
