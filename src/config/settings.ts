/**
 * @interface IUserSettings
 * @description 应用状态配置契约。定义功能增强模块的启停控制及底层微服务的域名寻址。
 */
export interface IUserSettings {
    enableProductionBigScreen: boolean;
    enableProjectInventory: boolean;
    enableBarcodePrintEnhance: boolean;
    enableProjectMaterialInventory: boolean;
    crawlerDomain: string;
    deepeningPersonnel?: string;
}

const DEFAULT_SETTINGS: IUserSettings = {
    enableProductionBigScreen: true,
    enableProjectInventory: true,
    enableBarcodePrintEnhance: true,
    enableProjectMaterialInventory: true,
    crawlerDomain: 'http://127.0.0.1:8000',
    deepeningPersonnel: ''
};

const STORAGE_KEY = 'HHJG_BIM_USER_SETTINGS';

/**
 * @class SettingsManager
 * @description 全局配置管理器。利用单例模式封装本地存储读写，确保配置状态生命周期一致性，并提供防篡改数据副本。
 */
class SettingsManager {
    private settings: IUserSettings;

    constructor() {
        this.settings = this.loadSettings();
    }

    private loadSettings(): IUserSettings {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            } catch (e) {
                console.warn('[System] 配置解析异常，已执行默认配置降级');
                return DEFAULT_SETTINGS;
            }
        }
        return DEFAULT_SETTINGS;
    }

    public get(): IUserSettings {
        return { ...this.settings };
    }

    public update(newSettings: Partial<IUserSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    }
}

export const settings = new SettingsManager();
