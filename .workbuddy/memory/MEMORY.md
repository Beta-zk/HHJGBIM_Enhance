# HHJGBIM_Enhance 项目长期记忆

## 架构约定（2026-08-20 确立，同日升级 DomMaster）

- **分层**：`main.ts`（初始化编排）→ `core/`（增强引擎 + 基建：网络拦截、DOM 基建）→ `services/`（数据服务）→ `config/`、`utils/`、`view/`（Vue UI）。
- **宿主页面 Web 操作必须走 `core/DomMaster.ts`**（单例 `domMaster`，main 中 `domMaster.init()` 激活）：
  - 通用 DOM 原语：样式注入/移除、DOM 等待、类名/样式操作、元素构建、可拖拽面板、MutationObserver、点击/输入模拟、vxe 表格页脚重算、URL 匹配。
  - 页面情报缓存：SPA 路由监听（hash/popstate/history 钩子）→ 400ms 防抖重扫，缓存 URL/标题/可见文本索引；`getSnapshot()`、`onRouteChange(cb)`、`findByText(text, {exact?, scope?})`（按文本查元素，scope 传容器时跳过索引实时扫描）。
  - 主流工具：`debounce`/`throttle`/`scrollIntoView`/`getQueryParam`。
  - core 模块禁止直接操作 document/window 级 API，只允许元素级单点调用（如 `el.style.display`、`el.querySelector`）。
- **通用性铁律**：DomMaster 只提供通用能力（findByText 返回元素即可）；调用方复杂需求（如归属路径、选中/展开）自行在自身逻辑实现，禁止为单个调用方塞专用方法。
- **数据服务统一走 `GMHttpClient.postWithAuth(url, payload)`**（凭证等待 + 提权请求 + 空响应归一化），不再各自 waitForToken。
- `API_URLS` 为 `as const` 字面量类型；`utils/helpers.ts` 仅保留 `showToast`。
- 新增 web 能力优先挂到 DomMaster，避免在 core 内联重复 DOM 代码。
- 注释规范：JSDoc 描述需精确概括职责；每模块保留就绪日志 + 错误日志，不写过程日志。

## 构建环境备忘（Windows）

- pnpm 命令用 `node "C:\Program Files\nodejs\node_modules\corepack\dist\pnpm.js" exec <cmd>`。
- `vite build` 前必须先 `rm -rf dist`（vite prepareOutDir 清空被 WorkBuddy safe-delete 拦截，直接报 Build failed）。
- 类型检查：`pnpm exec tsc --noEmit`。

## 已知页面结构

- 状态筛选面板定位锚点：`.cs-z-page-main-content`；面板容器 id：`hhjg-state-filter-container`。
- 状态行/单元格样式类：`hhjg-state-row-enhanced` / `hhjg-state-cell-enhanced`；状态圆点：`.hhjg-state-indicator`。
- vxe 表格页脚：`.vxe-table--footer tfoot`，正文 `.vxe-table--body tbody`。
- **条码打印页（barcode-manager/proprint，Element UI）**：
  - filter 区：`.barcode-filter-form` > `.filter-wrapper` > `.filter-left`（宿主原"名称"输入区，textarea 类 `.el-textarea__inner`）+ `.filter-right`。
  - 表格区：`main.el-main.table-main` > `.t-wrapper` > `.el-table.cs-custom-table`；表体 `.el-table__body-wrapper`，表头 `.el-table__header-wrapper`。
  - 分页条 `.custom-pagination` 是 `.t-wrapper` 的兄弟节点。
  - 查询按钮为 `.el-button--primary` 且文本精确为"查询"（旧 `.filters button` 已失效；注意 includes 文本匹配会误命中本模块注入的"查询所属构件"按钮，必须精确匹配）。
  - 宿主接口：`/PRO/PrintTemplate/GetPageSettingBarcodeRead` 触发控件注入。
  - 滚动修复（临时样式 id `temp-fix-barcode-table-scroll`）：表体 `max-height: min(calc(100vh - 320px), 620px) !important; overflow: auto !important;`，表头固定、表体滚动、分页条不被遮挡；宿主自行修复后可整体删除。
  - 本模块控件组类：`.hhjg-barcode-wrapper`（注入 filter-left 内）；清单悬浮框 id `hhjg-barcode-result-panel`，类 `hhjg-barcode-panel` / `-header` / `-body` / `-close`。
