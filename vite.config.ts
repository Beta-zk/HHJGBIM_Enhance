import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'BIMTK 数据合并拦截器 (A/C同步-V12终局生产版)',
        namespace: 'http://tampermonkey.net/',
        version: '4.0',
        description: '动态窃取标头跨域拉取C请求，修正State_Name字段映射并无感注入',
        match: ['*://*.bimtk.com/*'],
        grant: ['GM_xmlhttpRequest'],
        connect: ['integ-plat-proj-api.bimtk.com'],
        'run-at': 'document-start',
      },
      build: {
        externalGlobals: {},
      },
    }),
  ],
});
