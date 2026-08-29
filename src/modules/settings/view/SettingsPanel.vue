<template>
    <div v-if="settingsStore.isVisible" class="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[2147483648] flex items-center justify-center">
        <div class="w-[50vw] min-w-[550px] max-w-[800px] bg-slate-800 border border-solid border-slate-700 rounded-xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)] flex flex-col">
            <div class="p-5 px-6 border-0 border-b border-solid border-slate-700 flex justify-between items-center">
                <span class="text-slate-50 text-[18px] font-semibold">偏好设置中心</span>
                <button class="bg-transparent border border-solid border-slate-600 rounded-md text-slate-400 py-1.5 px-3 cursor-pointer appearance-none outline-none transition-all duration-200 hover:bg-slate-700 hover:text-slate-50 hover:border-slate-50" @click="handleClose">放弃更改并关闭</button>
            </div>

            <div class="p-6 flex flex-col gap-6">
                <div class="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-solid border-slate-800">
                    <div class="flex-1 mr-5">
                        <h4 class="m-0 mb-1.5 text-slate-200 text-[15px]">生产集成大屏增强</h4>
                        <p class="m-0 text-slate-400 text-[13px] leading-relaxed">允许点击指标直接无缝跳转至对应的系统二级页面。</p>
                    </div>
                    <label class="relative inline-block w-11 h-6 shrink-0">
                        <input type="checkbox" v-model="formState.enableProductionBigScreen" class="peer opacity-0 w-0 h-0 absolute appearance-none">
                        <span class="absolute cursor-pointer inset-0 bg-slate-600 transition duration-300 rounded-full before:absolute before:content-[''] before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:transition before:duration-300 before:rounded-full peer-checked:bg-sky-400 peer-checked:before:translate-x-[20px]"></span>
                    </label>
                </div>

                <div class="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-solid border-slate-800">
                    <div class="flex-1 mr-5">
                        <h4 class="m-0 mb-1.5 text-slate-200 text-[15px]">项目状态生命周期增强</h4>
                        <p class="m-0 text-slate-400 text-[13px] leading-relaxed">为项目表格动态注入生命周期状态指示器及全局筛选面板。</p>
                    </div>
                    <label class="relative inline-block w-11 h-6 shrink-0">
                        <input type="checkbox" v-model="formState.enableProjectState" class="peer opacity-0 w-0 h-0 absolute appearance-none">
                        <span class="absolute cursor-pointer inset-0 bg-slate-600 transition duration-300 rounded-full before:absolute before:content-[''] before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:transition before:duration-300 before:rounded-full peer-checked:bg-sky-400 peer-checked:before:translate-x-[20px]"></span>
                    </label>
                </div>

                <div class="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-solid border-slate-800">
                    <div class="flex-1 mr-5">
                        <h4 class="m-0 mb-1.5 text-slate-200 text-[15px]">条码打印联动增强</h4>
                        <p class="m-0 text-slate-400 text-[13px] leading-relaxed">在条码打印页通过排产单号快捷查询构件条码，并自动级联选中所属项目执行查询。</p>
                    </div>
                    <label class="relative inline-block w-11 h-6 shrink-0">
                        <input type="checkbox" v-model="formState.enableBarcodePrintEnhance" class="peer opacity-0 w-0 h-0 absolute appearance-none">
                        <span class="absolute cursor-pointer inset-0 bg-slate-600 transition duration-300 rounded-full before:absolute before:content-[''] before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:transition before:duration-300 before:rounded-full peer-checked:bg-sky-400 peer-checked:before:translate-x-[20px]"></span>
                    </label>
                </div>

                <div class="flex flex-col items-start gap-3 bg-slate-900 p-4 rounded-lg border border-solid border-slate-800">
                    <div class="w-full">
                        <h4 class="m-0 mb-1.5 text-slate-200 text-[15px]">深化人员名单配置</h4>
                        <p class="m-0 text-slate-400 text-[13px] leading-relaxed">用于动态抓取月度深化绩效数据。请输入人员姓名，多人请使用英文逗号(,)隔开。</p>
                    </div>
                    <div class="w-full">
                        <input type="text" v-model="formState.deepeningPersonnel" class="w-full box-border bg-slate-800 border border-solid border-slate-600 rounded-md text-slate-50 py-2 px-3 appearance-none outline-none transition-colors duration-200 focus:border-sky-400"
                            placeholder="例如: 张三,李四,王五" />
                    </div>
                </div>

                <div class="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-solid border-slate-800">
                    <div class="flex-1 mr-5">
                        <h4 class="m-0 mb-1.5 text-slate-200 text-[15px]">本地辅助爬虫服务地址</h4>
                        <p class="m-0 text-slate-400 text-[13px] leading-relaxed">配置后才可使用爬虫服务。</p>
                    </div>
                    <div class="flex items-center gap-2.5">
                        
                        <div class="max-w-[200px] overflow-hidden whitespace-nowrap mr-2 flex items-center" v-if="isInitializing || progressValue > 0" ref="marqueeWrapperRef">
                            <span class="text-sky-400 text-[13px] font-medium inline-block highlight-step" ref="marqueeTextRef" :class="{ 'is-scrolling': isOverflowing }">
                                {{ currentStep }}
                            </span>
                        </div>

                        <div class="relative w-7 h-7 flex items-center justify-center shrink-0" v-if="isInitializing || progressValue > 0" :title="currentStep">
                            <svg class="transform -rotate-90" width="28" height="28">
                                <circle stroke="#334155" stroke-width="2.5" fill="transparent" r="12" cx="14" cy="14" />
                                <circle class="transition-all duration-400 ease-in-out" stroke="#38bdf8" stroke-width="2.5" fill="transparent" r="12" cx="14" cy="14"
                                    :style="{ strokeDasharray: '75.4', strokeDashoffset: 75.4 - (progressValue / 100) * 75.4 }" />
                            </svg>
                            <span class="absolute text-[9px] text-slate-50 font-bold select-none">{{ progressValue }}%</span>
                        </div>
                        
                        <span class="text-[18px] select-none w-6 text-center" v-else
                            :title="pingStatus === 'success' ? '连通正常' : (pingStatus === 'error' ? '失联或跨域拒绝' : (pingStatus === 'loading' ? '检测中...' : '待检测'))">
                            {{ pingStatus === 'success' ? '✅' : (pingStatus === 'error' ? '❌' : (pingStatus === 'loading' ? '⏳' : '⚪')) }}
                        </span>

                        <input type="text" v-model="formState.crawlerDomain" @blur="checkPing" class="w-[190px] bg-slate-800 border border-solid border-slate-600 rounded-md text-slate-50 py-2 px-3 appearance-none outline-none transition-colors duration-200 focus:border-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="默认: http://127.0.0.1:8000" :disabled="isInitializing" />
                            
                        <button class="w-9 h-9 flex items-center justify-center shrink-0 bg-slate-700 border border-solid border-slate-600 rounded-md text-slate-50 cursor-pointer appearance-none outline-none transition-colors hover:bg-slate-600 hover:border-sky-400 disabled:hover:bg-slate-700 disabled:hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale" @click="triggerInit"
                            :disabled="isInitializing || pingStatus !== 'success'">
                            <span>🔄</span>
                        </button>
                    </div>
                </div>

                <div class="bg-sky-400/10 border border-dashed border-sky-400 text-sky-300 p-3 rounded-md text-[13px]">
                    提示：修改配置后，需点击“保存并应用”持久化。
                </div>
            </div>

            <div class="py-4 px-6 border-0 border-t border-solid border-slate-700 flex justify-end">
                <button class="bg-[#0284c7] text-[#f0f9ff] border-0 appearance-none outline-none py-2.5 px-5 rounded-md font-semibold cursor-pointer transition-colors duration-200 hover:bg-[#0369a1] disabled:hover:bg-[#0284c7] disabled:opacity-50 disabled:cursor-not-allowed" @click="handleSave" :disabled="isInitializing">保存并应用</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, onUnmounted, watch, nextTick } from 'vue';
import { settings, type IUserSettings } from '../../../config/settings';
import { systemService } from '../../../services/SystemService';
import { showToast } from '../../../utils/helpers';
import { settingsStore } from '../store';

const formState = reactive<IUserSettings>({
    enableProductionBigScreen: true,
    enableProjectState: true,
    enableBarcodePrintEnhance: true,
    enableProjectMaterialInventory: true,
    crawlerDomain: '',
    deepeningPersonnel: ''
});

const pingStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const isInitializing = ref(false);
const progressValue = ref(0);
const currentStep = ref('');
let pollTimer: any = null;

const marqueeWrapperRef = ref<HTMLElement | null>(null);
const marqueeTextRef = ref<HTMLElement | null>(null);
const isOverflowing = ref(false);

onMounted(() => {
    const currentConfig = settings.get();
    formState.enableProductionBigScreen = currentConfig.enableProductionBigScreen;
    // 回退旧版数据至新定义的配置键，缺省为 true 保证平滑过渡
    formState.enableProjectState = currentConfig.enableProjectState ?? true;
    formState.enableBarcodePrintEnhance = currentConfig.enableBarcodePrintEnhance ?? true;
    formState.enableProjectMaterialInventory = currentConfig.enableProjectMaterialInventory ?? true;
    formState.crawlerDomain = currentConfig.crawlerDomain;
    formState.deepeningPersonnel = currentConfig.deepeningPersonnel || '';

    setTimeout(() => { checkPing(); }, 100);
});

onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
});

const checkTextOverflow = async () => {
    await nextTick();
    if (marqueeWrapperRef.value && marqueeTextRef.value) {
        const wrapperWidth = marqueeWrapperRef.value.clientWidth;
        const textWidth = marqueeTextRef.value.scrollWidth;
        
        if (textWidth > wrapperWidth) {
            isOverflowing.value = true;
            const dist = textWidth - wrapperWidth + 15;
            marqueeTextRef.value.style.setProperty('--scroll-dist', `-${dist}px`);
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
        const res = await systemService.pingAt(formState.crawlerDomain, {});
        pingStatus.value = (res && res.status === 'success') ? 'success' : 'error';
    } catch {
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
        const res = await systemService.systemIntAt(formState.crawlerDomain, {});
        
        if (res && res.status === 'success' && res.taskId) {
            showToast('初始化任务已进入后台队列', true);
            startPolling(res.taskId);
        } else {
            showToast('系统初始化指令投递失败，未返回任务流凭证', false);
            isInitializing.value = false;
        }
    } catch {
        showToast('系统初始化通讯异常', false);
        isInitializing.value = false;
    }
};

const startPolling = (taskId: string) => {
    if (pollTimer) clearInterval(pollTimer);
    
    pollTimer = setInterval(async () => {
        try {
            const res = await systemService.getTaskProgress(taskId, formState.crawlerDomain);
            
            if (res) {
                progressValue.value = res.progress || 0;
                currentStep.value = res.current_step || '';

                if (res.status === 'completed') {
                    clearInterval(pollTimer);
                    isInitializing.value = false;
                    showToast('全量爬虫任务已完成！', true);
                    
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
        } catch {
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
    settingsStore.close();
};

const handleSave = () => {
    settings.update({
        enableProductionBigScreen: formState.enableProductionBigScreen,
        enableProjectState: formState.enableProjectState,
        enableBarcodePrintEnhance: formState.enableBarcodePrintEnhance,
        enableProjectMaterialInventory: formState.enableProjectMaterialInventory,
        crawlerDomain: formState.crawlerDomain,
        deepeningPersonnel: formState.deepeningPersonnel
    });
    showToast('配置已持久化保存，请手动刷新页面以重新加载增强引擎。', true);
    settingsStore.close();
};
</script>

<style scoped>
.is-scrolling {
    animation: text-marquee var(--scroll-duration, 3s) linear 0.05s infinite;
}

@keyframes text-marquee {
    0%, 15% { transform: translateX(0); }
    85%, 100% { transform: translateX(var(--scroll-dist)); }
}
</style>
