import { defineConfig } from "vite";
import monkey, { cdn } from "vite-plugin-monkey";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "HHJGBIM_Enhance",
        namespace: "http://tampermonkey.net/",
        version: "0.3.0",
        description: "华泓精工比姆泰克增强脚本 by 江西华泓精工",
        match: ["*://*.bimtk.com/*"],
        grant: ["GM_xmlhttpRequest"],
        connect: [
          "integ-plat-proj-api.bimtk.com",
          "integ-plat-produce-api.bimtk.com",
        ],
        "run-at": "document-start",
      },
      build: {
        externalGlobals: {
          vue: cdn.jsdelivr("Vue", "dist/vue.global.prod.js"),
          echarts: cdn.jsdelivr("echarts", "dist/echarts.min.js"),
        },
      },
    }),
  ],
});
