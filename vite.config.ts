import { defineConfig } from "vite";
import monkey, { cdn } from "vite-plugin-monkey";
import vue from "@vitejs/plugin-vue";
import pkg from "./package.json";

export default defineConfig({
  plugins: [
    vue(),
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "HHJGBIM_Enhance",
        namespace: "http://tampermonkey.net/",
        version: pkg.version,
        description: "华泓精工比姆泰克增强脚本 by 江西华泓精工",
        match: ["*://*.bimtk.com/*"],
        grant: ["GM_xmlhttpRequest"],
        connect: [
          "integ-plat-proj-api.bimtk.com",
          "integ-plat-produce-api.bimtk.com",
          "127.0.0.1"
        ],
        "run-at": "document-start",
        updateURL: "https://github.com/Beta-zk/HHJGBIM_Enhance/releases/latest/download/HHJGBIM_Enhance.meta.js",
        downloadURL: "https://github.com/Beta-zk/HHJGBIM_Enhance/releases/latest/download/HHJGBIM_Enhance.user.js",
      },
      build: {
        metaFileName: true,
        externalGlobals: {
          vue: cdn.jsdelivr("Vue", "dist/vue.global.prod.js"),
          echarts: cdn.jsdelivr("echarts", "dist/echarts.min.js"),
        },
      },
    }),
  ],
});
