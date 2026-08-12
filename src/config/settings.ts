/**
 * @interface IUserSettings
 * @description 前端用户配置项结构规范
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
 * @description 用户配置管理器。采用单例模式管控应用级配置，提供缓存读取与动态暴露能力。
 */
class SettingsManager {
    private settings: IUserSettings;

    constructor() {
        this.settings = this.loadSettings();
    }

    /**
     * @method loadSettings
     * @description 从本地存储反序列化配置项，若缺失或损坏则安全降级回填默认值
     * @returns {IUserSettings}
     * @private
     */
    private loadSettings(): IUserSettings {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            } catch (e) {
                console.warn('[HHJGBIM_Enhance] 配置文件解析异常，已重置为默认态');
                return DEFAULT_SETTINGS;
            }
        }
        return DEFAULT_SETTINGS;
    }

    /**
     * @method get
     * @description 暴露当前运行时配置项对象的深拷贝或 JSON 表示
     * @returns {IUserSettings}
     */
    public get(): IUserSettings {
        // 利用扩展运算符阻断外部针对成员变量的直接篡改
        return { ...this.settings };
    }

    /**
     * @method update
     * @description 增量更新配置项并写入底层持久化存储
     * @param {Partial<IUserSettings>} newSettings 配置变更载荷
     */
    public update(newSettings: Partial<IUserSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    }
}

// 导出单例对象以供全局调用
export const settings = new SettingsManager();
