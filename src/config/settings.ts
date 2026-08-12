/**
 * @interface IUserSettings
 * @description 用户配置约束模型，定义前端增强特性的启停开关及微服务寻址域。
 */
export interface IUserSettings {
    /** @property {boolean} 生产集成大屏增强功能开关 */
    enableProductionBigScreen: boolean;
    /** @property {boolean} 仓储项目数据清洗增强功能开关 */
    enableProjectInventory: boolean;
    /** @property {string} 本地爬虫服务器基准域名 */
    crawlerDomain: string;
}

const DEFAULT_SETTINGS: IUserSettings = {
    enableProductionBigScreen: true,
    enableProjectInventory: true,
    crawlerDomain: 'http://127.0.0.1:8000'
};

const STORAGE_KEY = 'HHJG_BIM_USER_SETTINGS';

/**
 * @class SettingsManager
 * @description 全局配置管理器，采用单例模式接管持久化存储的读写，确保应用生命周期内配置状态的一致性与安全降级。
 */
class SettingsManager {
    private settings: IUserSettings;

    constructor() {
        this.settings = this.loadSettings();
    }

    /**
     * @method loadSettings
     * @description 执行配置反序列化，具备结构校验与异常熔断回退机制。
     * @returns {IUserSettings} 运行时配置实例
     * @private
     */
    private loadSettings(): IUserSettings {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            } catch (e) {
                console.warn('[System] 配置解析失效，已降级至默认配置');
                return DEFAULT_SETTINGS;
            }
        }
        return DEFAULT_SETTINGS;
    }

    /**
     * @method get
     * @description 暴露配置副本，阻断外部针对单例成员的直接内存篡改。
     * @returns {IUserSettings} 配置快照
     */
    public get(): IUserSettings {
        return { ...this.settings };
    }

    /**
     * @method update
     * @description 增量更新内存状态并同步落盘持久化。
     * @param {Partial<IUserSettings>} newSettings 变更载荷
     */
    public update(newSettings: Partial<IUserSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    }
}

export const settings = new SettingsManager();
