<template>
    <div class="settings-overlay">
        <div class="settings-container">
            <div class="settings-header">
                <span class="title">偏好设置中心</span>
                <button class="close-btn" @click="handleClose">放弃更改并关闭</button>
            </div>

            <div class="settings-body">
                <div class="setting-item">
                    <div class="item-info">
                        <h4 class="item-title">生产集成大屏增强</h4>
                        <p class="item-desc">允许点击指标直接无缝跳转至对应的系统二级页面。</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="formState.enableProductionBigScreen">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="item-info">
                        <h4 class="item-title">项目库存统计状态增强</h4>
                        <p class="item-desc">为新增的一列状态提供数据信息。</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="formState.enableProjectInventory">
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="setting-item column-layout">
                    <div class="item-info full-width">
                        <h4 class="item-title">深化人员名单配置</h4>
                        <p class="item-desc">用于动态抓取月度深化绩效数据。请输入人员姓名，多人请使用英文逗号(,)隔开。</p>
                    </div>
                    <div class="input-full-row">
                        <input type="text" v-model="formState.deepeningPersonnel" class="crawler-input wide-input"
                            placeholder="例如: 张三,李四,王五" />
                    </div>
                </div>

                <div class="setting-item">
                    <div class="item-info">
                        <h4 class="item-title">本地辅助爬虫服务地址</h4>
                        <p class="item-desc">配置后才可使用爬虫服务。</p>
                    </div>
                    <div class="crawler-input-group">
                        
                        <!-- 状态文本遮罩层：结合Vue监听器动态触发跑马灯 -->
                        <div class="status-marquee-wrapper" v-if="isInitializing || progressValue > 0" ref="marqueeWrapperRef">
                            <span class="highlight-step" ref="marqueeTextRef" :class="{ 'is-scrolling': isOverflowing }">
                                {{ currentStep }}
                            </span>
                        </div>

                        <!-- 进度展示区 -->
                        <div class="progress-wrapper" v-if="isInitializing || progressValue > 0" :title="currentStep">
                            <svg class="progress-ring" width="28" height="28">
                                <circle class="progress-ring-bg" stroke="#334155" stroke-width="2.5" fill="transparent" r="12" cx="14" cy="14" />
                                <circle class="progress-ring-circle" stroke="#38bdf8" stroke-width="2.5" fill="transparent" r="12" cx="14" cy="14"
                                    :style="{ strokeDasharray: '75.4', strokeDashoffset: 75.4 - (progressValue / 100) * 75.4 }" />
                            </svg>
                            <span class="progress-text">{{ progressValue }}%</span>
                        </div>
                        
                        <!-- 健康度探测位 -->
                        <span class="ping-indicator" v-else
                            :title="pingStatus === 'success' ? '连通正常' : (pingStatus === 'error' ? '失联或跨域拒绝' : (pingStatus === 'loading' ? '检测中...' : '待检测'))">
                            {{ pingStatus === 'success' ? '✅' : (pingStatus === 'error' ? '❌' : (pingStatus === 'loading' ? '⏳' : '⚪')) }}
                        </span>

                        <input type="text" v-model="formState.crawlerDomain" @blur="checkPing" class="crawler-input"
                            placeholder="例如: http://127.0.0.1:8000" :disabled="isInitializing" />
                            
                        <button class="init-btn" @click="triggerInit"
                            :disabled="isInitializing || pingStatus !== 'success'">
                            <span class="action-icon">🔄</span>
                        </button>
                    </div>
                </div>

                <div class="tip-box">
                    提示：修改配置后，需点击“保存配置并应用”持久化。
                </div>
            </div>

            <div class="settings-footer">
                <button class="save-btn" @click="handleSave" :disabled="isInitializing">保存并应用</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * @module SystemSettings
 * @description 应用状态集线器。深度集成了基于任务凭证(TaskId)的异步爬虫轮询协议及UI级跑马灯防抖控制。
 */
import { reactive, onMounted, ref, onUnmounted, watch, nextTick } from 'vue';
import { settings, type IUserSettings } from '../../config/settings';
import { API_URLS } from '../../config/constants';
import { GMHttpClient } from '../../core/GMHttpClient';
import { showToast } from '../../utils/helpers';

const emit = defineEmits(['close']);

const formState = reactive<IUserSettings>({
    enableProductionBigScreen: true,
    enableProjectInventory: true,
    crawlerDomain: '',
    deepeningPersonnel: ''
});

const pingStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const isInitializing = ref(false);
const progressValue = ref(0);
const currentStep = ref('');
let pollTimer: any = null;

// 跑马灯状态观测节点
const marqueeWrapperRef = ref<HTMLElement | null>(null);
const marqueeTextRef = ref<HTMLElement | null>(null);
const isOverflowing = ref(false);

onMounted(() => {
    const currentConfig = settings.get();
    formState.enableProductionBigScreen = currentConfig.enableProductionBigScreen;
    formState.enableProjectInventory = currentConfig.enableProjectInventory;
    formState.crawlerDomain = currentConfig.crawlerDomain;
    formState.deepeningPersonnel = currentConfig.deepeningPersonnel || '';

    setTimeout(() => { checkPing(); }, 100);
});

onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
});

/**
 * @method checkTextOverflow
 * @description 游标文本溢出测算。自动注入位移偏差变量与动态运动速率，以适配不同长度的提示文本。
 */
const checkTextOverflow = async () => {
    await nextTick();
    if (marqueeWrapperRef.value && marqueeTextRef.value) {
        const wrapperWidth = marqueeWrapperRef.value.clientWidth;
        const textWidth = marqueeTextRef.value.scrollWidth;
        
        if (textWidth > wrapperWidth) {
            isOverflowing.value = true;
            // 预留 15px 呼吸空间，避免文字边缘贴合过紧
            const dist = textWidth - wrapperWidth + 15;
            marqueeTextRef.value.style.setProperty('--scroll-dist', `-${dist}px`);
            // 根据溢出长度计算恒定滚动速率 (约为每秒30px)
            const duration = Math.max(2, dist / 30);
            marqueeTextRef.value.style.setProperty('--scroll-duration', `${duration}s`);
        } else {
            isOverflowing.value = false;
        }
    }
};

watch(currentStep, checkTextOverflow);

const checkPing = async () => {
    if (!formState.crawlerDomain) {
        pingStatus.value = 'idle';
        return;
    }
    pingStatus.value = 'loading';
    try {
        const targetUrl = `${formState.crawlerDomain.replace(/\/$/, '')}${API_URLS.LOCAL_SYSTEM_PING_PATH}`;
        const res = await GMHttpClient.post(targetUrl, {});
        pingStatus.value = (res && res.status === 'success') ? 'success' : 'error';
    } catch (error) {
        pingStatus.value = 'error';
    }
};

const triggerInit = async () => {
    if (isInitializing.value) return;
    if (!formState.crawlerDomain) {
        showToast('请先填写爬虫服务地址', false);
        return;
    }
    
    isInitializing.value = true;
    progressValue.value = 0;
    currentStep.value = '请求建立任务...';
    
    try {
        const targetUrl = `${formState.crawlerDomain.replace(/\/$/, '')}${API_URLS.LOCAL_SYSTEM_INT_PATH}`;
        const res = await GMHttpClient.post(targetUrl, {});
        
        if (res && res.status === 'success' && res.taskId) {
            showToast('初始化任务已进入后台队列', true);
            startPolling(res.taskId);
        } else {
            showToast('系统初始化指令投递失败，未返回任务流凭证', false);
            isInitializing.value = false;
        }
    } catch (error) {
        showToast('系统初始化通讯异常', false);
        isInitializing.value = false;
    }
};

const startPolling = (taskId: string) => {
    if (pollTimer) clearInterval(pollTimer);
    
    pollTimer = setInterval(async () => {
        try {
            const progressUrl = `${formState.crawlerDomain.replace(/\/$/, '')}${API_URLS.LOCAL_SYSTEM_PROGRESS_PATH}`;
            const res = await GMHttpClient.post(progressUrl, { taskId });
            
            if (res) {
                progressValue.value = res.progress || 0;
                currentStep.value = res.current_step || '';

                if (res.status === 'completed') {
                    clearInterval(pollTimer);
                    isInitializing.value = false;
                    showToast('恭喜，后台全量爬虫任务已同步完成！', true);
                    
                    setTimeout(() => {
                        progressValue.value = 0;
                        currentStep.value = '';
                    }, 4000);
                } else if (res.status === 'error') {
                    clearInterval(pollTimer);
                    isInitializing.value = false;
                    showToast(`任务崩溃中止: ${res.current_step}`, false);
                }
            }
        } catch (error) {
            clearInterval(pollTimer);
            isInitializing.value = false;
            showToast('无法获取实时进度，请求断开', false);
        }
    }, 1500);
};

const handleClose = () => { 
    if (isInitializing.value) {
        showToast('后台任务仍在运行中，设置中心仅执行隐藏操作。', true);
    }
    emit('close'); 
};

const handleSave = () => {
    settings.update({
        enableProductionBigScreen: formState.enableProductionBigScreen,
        enableProjectInventory: formState.enableProjectInventory,
        crawlerDomain: formState.crawlerDomain,
        deepeningPersonnel: formState.deepeningPersonnel
    });
    showToast('配置已持久化保存，请手动刷新页面以重新加载增强引擎。', true);
    emit('close');
};
</script>

<style scoped>
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

.column-layout {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

.full-width {
    width: 100%;
    margin-right: 0;
}

.input-full-row {
    width: 100%;
}

.wide-input {
    width: 100%;
    box-sizing: border-box;
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

/* --- 新增：跑马灯容器与动画逻辑 --- */
.status-marquee-wrapper {
    max-width: 200px;
    overflow: hidden;
    white-space: nowrap;
    margin-right: 8px;
    display: flex;
    align-items: center;
}

.highlight-step {
    color: #38bdf8;
    font-size: 13px;
    font-weight: 500;
    display: inline-block;
}

.is-scrolling {
    /* 注入 50ms (0.05s) 延迟，首尾停留阅读 */
    animation: text-marquee var(--scroll-duration, 3s) linear 0.05s infinite;
}

@keyframes text-marquee {
    0%, 15% { transform: translateX(0); }
    85%, 100% { transform: translateX(var(--scroll-dist)); }
}
/* ---------------------------------- */

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

.progress-wrapper {
    position: relative;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.progress-ring {
    transform: rotate(-90deg);
}

.progress-ring-circle {
    transition: stroke-dashoffset 0.4s ease-in-out;
}

.progress-text {
    position: absolute;
    font-size: 9px;
    color: #f8fafc;
    font-weight: bold;
    user-select: none;
}

.crawler-input {
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 6px;
    color: #f8fafc;
    padding: 8px 12px;
    outline: none;
    transition: border-color 0.2s;
    width: 190px;
}

.crawler-input:focus {
    border-color: #38bdf8;
}

.crawler-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    flex-shrink: 0;
}

.init-btn:hover:not(:disabled) {
    background: #475569;
    border-color: #38bdf8;
}

.init-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(100%);
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

.save-btn:hover:not(:disabled) {
    background: #0369a1;
}

.save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
