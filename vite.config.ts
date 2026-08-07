import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "HHJGBIM_Enhance",
        namespace: "http://tampermonkey.net/",
        version: "0.1.4",
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
        externalGlobals: {},
      },
    }),
  ],
});
