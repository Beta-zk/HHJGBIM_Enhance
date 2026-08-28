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
         * 支持传入外部 http/https 图片链接，或直接使用 data:image Base64 编码以防止防盗链拦截。
         */
        icon: "https://002-bj.oss-cn-hangzhou.aliyuncs.com/undefined/2024/11/19/33_51_943/%E7%B2%BE%E5%B7%A5LOGO.png?Expires=1787905002&OSSAccessKeyId=LTAI5tA3Tns5RBXt8s7qmoD2&Signature=FDbg%2BHuv%2BDitvgfGh6biVBdIkLE%3D",
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
