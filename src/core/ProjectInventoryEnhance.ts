import { WAREHOUSE_DATA_STATS_URL } from '../config/constants';
import { projectStatusService } from '../services/ProjectStatusService';
import { findArrayWithKey } from '../utils/helpers';
import { BimProjectItem } from '../types';

export class ProjectInventoryEnhance {
    private injectTargetData(responseData: any): any {
        try {
            const dataLayer = findArrayWithKey(responseData, 'Project_Name') as BimProjectItem[];
            if (dataLayer && dataLayer.length > 0) {
                let modifiedCount = 0;
                dataLayer.forEach(item => {
                    if (item && item.Project_Name && projectStatusService.projectStatusMap.has(item.Project_Name)) {
                        item.Status_Name = projectStatusService.projectStatusMap.get(item.Project_Name)!;
                        modifiedCount++;
                    } else if (item && item.Project_Name && item.Status_Name === undefined) {
                        item.Status_Name = null;
                    }
                });
                console.log(`[BIMTK 拦截器] A请求渲染前拦截成功，已动态注入 ${modifiedCount} 条 Status_Name 数据！`);
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
            projectStatusService.updateHeaders(header, value);
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
                projectStatusService.ensureProjectStatusSynced().then(() => { originalXHRSend.apply(this, args as any); });
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
                    projectStatusService.updateHeaders(key, value);
                });
            }

            if (requestUrl.includes(WAREHOUSE_DATA_STATS_URL)) {
                await projectStatusService.ensureProjectStatusSynced();
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
