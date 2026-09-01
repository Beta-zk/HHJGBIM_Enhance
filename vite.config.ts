/**
 * @module ViteConfig
 * @description 配置 Vite 构建与油猴脚本元数据，管理依赖外置、插件注入及脚本基础 UI 属性。
 */
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
        /**
         * @property {string} icon 脚本图标。
         * 采用外部 CDN 链接解耦静态资产，避免 Base64 导致的代码体积膨胀。
         * 示例链接指向本项目的 GitHub 仓库，推荐使用 jsDelivr 进行国内加速。
         */
        icon: "https://cdn.jsdelivr.net/gh/Beta-zk/HHJGBIM_Enhance@master/public/icon.png",
        grant: ["GM_xmlhttpRequest"],
        connect: [
          // 通用字典接口（GetDictionaryDetailListByCode），未登记将触发 GM_xmlhttpRequest 拒绝连接
          "integ-plat-api.bimtk.com",
          // [备用] 旧 PLM 项目实体分页接口域名，字典源切换后保留以备回退
          "integ-plat-proj-api.bimtk.com",
          "integ-plat-produce-api.bimtk.com",
          "127.0.0.1"
        ],
        "run-at": "document-start",
        // 禁止脚本注入 iframe，避免宿主同源嵌套页面内重复挂载内核面板
        noframes: true,
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
