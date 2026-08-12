<template>
    <div class="settings-overlay">
        <div class="settings-container">
            <div class="settings-header">
                <span class="title">偏好设置中心</span>
                <button class="close-btn" @click="handleClose">✖ 放弃并关闭</button>
            </div>

            <div class="settings-body">
                <div class="setting-item">
                    <div class="item-info">
                        <h4 class="item-title">生产集成大屏增强</h4>
                        <p class="item-desc">开启后将物理劫持大屏 DOM，允许点击指标直接无缝跳转至对应的系统二级页面。</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="formState.enableProductionBigScreen">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="item-info">
                        <h4 class="item-title">仓储项目数据清洗增强</h4>
                        <p class="item-desc">挂载底层网络监听，智能关联 PLM 字典，补全残缺的仓储项目状态映射关系。</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="formState.enableProjectInventory">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="item-info">
                        <h4 class="item-title">本地辅助爬虫服务寻址</h4>
                        <p class="item-desc">配置外部桥接 API 的基准网关域名，支持连通性自检与远程同步控制。</p>
                    </div>

                    <div class="crawler-input-group">
                        <span class="ping-indicator"
                            :title="pingStatus === 'success' ? '连通正常' : (pingStatus === 'error' ? '失联或跨域拒绝' : '待检测')">
                            {{ pingStatus === 'success' ? '✅' : (pingStatus === 'error' ? '❌' : '⚪') }}
                        </span>
                        <input type="text" v-model="formState.crawlerDomain" @blur="checkPing" class="crawler-input"
                            placeholder="例如: http://127.0.0.1:8000" />
                        <button class="init-btn" @click="triggerInit"
                            :disabled="isInitializing || pingStatus !== 'success'" title="触发爬虫全量同步">
                            <span class="action-icon" :class="{ 'spin': isInitializing }">🔄</span>
                        </button>
                    </div>
                </div>

                <div class="tip-box">
                    ℹ️ 提示：修改功能开关及网关配置后，需点击“保存配置并应用”持久化，并刷新宿主页面（F5）方可生效。
                </div>
            </div>

            <div class="settings-footer">
                <button class="save-btn" @click="handleSave">💾 保存配置并应用</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue';
import { settings, IUserSettings } from '../../config/settings';
import { API_URLS } from '../../config/constants'; // 【新增】：引入全局常量表
import { GMHttpClient } from '../../core/GMHttpClient';

const emit = defineEmits(['close']);

const formState = reactive<IUserSettings>({
    enableProductionBigScreen: true,
    enableProjectInventory: true,
    crawlerDomain: ''
});

const pingStatus = ref<'idle' | 'success' | 'error'>('idle');
const isInitializing = ref(false);

onMounted(() => {
    const currentConfig = settings.get();
    formState.enableProductionBigScreen = currentConfig.enableProductionBigScreen;
    formState.enableProjectInventory = currentConfig.enableProjectInventory;
    formState.crawlerDomain = currentConfig.crawlerDomain;

    checkPing();
});

/**
 * @method checkPing
 * @description 发出探针请求，校验服务端存活状态，依托规范路由表拼接
 */
const checkPing = async () => {
    if (!formState.crawlerDomain) {
        pingStatus.value = 'idle';
        return;
    }
    pingStatus.value = 'idle';
    try {
        // 【规范化】：调用常量表进行路由拼接，兼顾结尾斜杠清洗
        const targetUrl = `${formState.crawlerDomain.replace(/\/$/, '')}${API_URLS.LOCAL_SYSTEM_PING_PATH}`;
        const res = await GMHttpClient.post(targetUrl, {});
        pingStatus.value = (res && res.status === 'success') ? 'success' : 'error';
    } catch (error) {
        pingStatus.value = 'error';
    }
};

/**
 * @method triggerInit
 * @description 驱动爬虫执行初始化作业，依托规范路由表拼接
 */
const triggerInit = async () => {
    if (!formState.crawlerDomain || pingStatus.value !== 'success') return;

    isInitializing.value = true;
    try {
        // 【规范化】：调用常量表进行路由拼接
        const targetUrl = `${formState.crawlerDomain.replace(/\/$/, '')}${API_URLS.LOCAL_SYSTEM_INT_PATH}`;
        const res = await GMHttpClient.post(targetUrl, {});

        if (res && res.status === 'accepted') {
            alert(`指令下发成功：\n${res.message}`);
        } else {
            alert('⚠️ 爬虫服务器未能返回预期的操作回执，请检查服务端日志。');
        }
    } catch (error) {
        alert('❌ 网络通信异常，任务派发失败。');
    } finally {
        isInitializing.value = false;
    }
};

const handleClose = () => {
    emit('close');
};

const handleSave = () => {
    settings.update({
        enableProductionBigScreen: formState.enableProductionBigScreen,
        enableProjectInventory: formState.enableProjectInventory,
        crawlerDomain: formState.crawlerDomain
    });
    alert('配置已持久化保存，请手动刷新页面以重新加载增强引擎。');
    emit('close');
};
</script>

<style scoped>
/* 样式与先前版本保持一致，未做删减 */
.settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(4px);
    z-index: 2147483648;
    display: flex;
    align-items: center;
    justify-content: center;
}

.settings-container {
    width: 50vw;
    min-width: 550px;
    max-width: 800px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
}

.settings-header {
    padding: 20px 24px;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.settings-header .title {
    color: #f8fafc;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 1px;
}

.close-btn {
    background: transparent;
    border: 1px solid #475569;
    border-radius: 6px;
    color: #94a3b8;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.close-btn:hover {
    background: #334155;
    color: #f8fafc;
}

.settings-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f172a;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #1e293b;
}

.item-info {
    flex: 1;
    margin-right: 20px;
}

.item-title {
    margin: 0 0 6px 0;
    color: #e2e8f0;
    font-size: 15px;
}

.item-desc {
    margin: 0;
    color: #94a3b8;
    font-size: 13px;
    line-height: 1.4;
}

.crawler-input-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ping-indicator {
    font-size: 18px;
    user-select: none;
    width: 24px;
    text-align: center;
}

.crawler-input {
    width: 200px;
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 6px;
    color: #f8fafc;
    padding: 8px 12px;
    outline: none;
    transition: border-color 0.2s;
}

.crawler-input:focus {
    border-color: #38bdf8;
}

.init-btn {
    background: #334155;
    border: 1px solid #475569;
    border-radius: 6px;
    color: #f8fafc;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.init-btn:hover:not(:disabled) {
    background: #475569;
    border-color: #38bdf8;
}

.init-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.action-icon {
    display: inline-block;
    font-size: 16px;
}

.action-icon.spin {
    animation: spin-anim 1.2s linear infinite;
}

@keyframes spin-anim {
    100% {
        transform: rotate(360deg);
    }
}

.switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #475569;
    transition: .3s;
    border-radius: 24px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
}

input:checked+.slider {
    background-color: #38bdf8;
}

input:checked+.slider:before {
    transform: translateX(20px);
}

.tip-box {
    background: rgba(56, 189, 248, 0.1);
    border: 1px dashed #38bdf8;
    color: #7dd3fc;
    padding: 12px;
    border-radius: 6px;
    font-size: 13px;
}

.settings-footer {
    padding: 16px 24px;
    border-top: 1px solid #334155;
    display: flex;
    justify-content: flex-end;
}

.save-btn {
    background: #0284c7;
    color: #f0f9ff;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.save-btn:hover {
    background: #0369a1;
}
</style>
