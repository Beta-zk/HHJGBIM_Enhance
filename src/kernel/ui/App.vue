<template>
  <div class="fixed top-1/2 right-0 -translate-y-1/2 w-[220px] bg-slate-800/95 text-slate-50 rounded-l-lg shadow-[-5px_0_25px_rgba(0,0,0,0.3)] backdrop-blur z-[2147483646] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border border-solid border-r-0 border-slate-700"
       :class="isExpanded ? 'translate-x-0' : 'translate-x-full'">

    <div class="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800/95 border border-solid border-r-0 border-slate-700 rounded-l-lg cursor-pointer flex items-center justify-center hover:bg-slate-700"
         @click="togglePanel">
      <span class="font-mono text-[18px] font-bold text-sky-400">{{ isExpanded ? '>' : '<' }}</span>
    </div>

    <div class="p-4">
      <div class="text-[14px] font-semibold border-0 border-b border-solid border-slate-600 pb-2.5 mb-4 text-center">增强面板</div>
      <div class="flex flex-col gap-2.5">
        <button v-for="entry in sortedEntries" :key="entry.id"
                class="bg-slate-700 text-slate-200 border border-solid border-slate-600 p-2.5 rounded-md cursor-pointer text-[13px] text-left transition-colors appearance-none outline-none hover:bg-slate-600 hover:border-sky-400 hover:text-white disabled:opacity-50 disabled:hover:bg-slate-700 disabled:hover:border-slate-600 disabled:hover:text-slate-200 disabled:cursor-not-allowed"
                :disabled="entry.disabled ? entry.disabled() : false"
                @click="entry.action()">
          {{ entry.text ? entry.text() : (entry.icon ? entry.icon + ' ' : '') + entry.label }}
        </button>
      </div>
    </div>
  </div>

  <!-- 全局插件组件动态装配区（沙箱映射） -->
  <component v-for="[id, comp] in uiStore.activeComponents" :is="comp" :key="id" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { uiStore } from './uiStore';
import { panelStore } from './panelStore';

const isExpanded = ref(false);

const togglePanel = () => { isExpanded.value = !isExpanded.value; };

const sortedEntries = computed(() => panelStore.sorted);
</script>
