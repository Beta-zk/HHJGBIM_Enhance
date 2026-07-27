import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'BIMTK 增强',
        namespace: 'http://tampermonkey.net/',
        version: '1.0',
        description: 'BIMTK 增强脚本 by 江西华泓精工',
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
