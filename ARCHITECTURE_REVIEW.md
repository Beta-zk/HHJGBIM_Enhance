# HHJGBIM_Enhance 架构评审报告

> 评审日期：2026-08-20 ｜ 基线：`tsc --noEmit` 0 错误；`vite build` 通过（120.5 kB / gzip 29.5 kB）
> 评审视角：**架构的可持续扩展能力**（"持续添砖加瓦"能力），非格式级优化。

---

## 一、现状架构总览

```
src/main.ts（命令式装配：new X().init() × 4 + 手动开关判断 + Vue 挂载）
│
├── core/ 基建层
│   ├── NetworkHook        XHR/Fetch 原型劫持：头部嗅探 + 响应拦截器注册（id 去重）
│   ├── DomMaster(单例)    DOM 原语（样式/元素/拖拽面板/观察器/交互模拟/vxe 页脚重算）
│   │                       + 页面情报缓存（SPA 路由监听→400ms 防抖重扫→文本索引→findByText）
│   ├── GMHttpClient       GM_xmlhttpRequest 提权请求 + 401 熔断
│   └── Enhance 模块 ×4    ProjectStateEnhance / BigScreen / BarcodePrint / MaterialInventory
│
├── services/ 数据服务层   AuthService(凭证嗅探/缓存/闭锁) + Project/System/Schduling/Component/Factory
├── config/                constants(API_URLS) + settings(localStorage 开关)
├── utils/helpers.ts       showToast
├── types/                 领域类型（目前仅 3 个界面模型）
└── view/                  Vue3 + Tailwind：App / PerformanceReport / Settings（CDN 外部化）
```

**值得肯定的既有设计（本次评审不动这些）：**
1. DomMaster 收敛全部宿主 DOM 原语，`buildTextIndex` 主动排除脚本自身 UI 容器（`#hhjgbim-vue-root`）——防自污染意识到位。
2. NetworkHook 拦截器以 `id` 去重防重复注册；`beforeRequest` 预取机制为"改数据前先取依赖"留了通道。
3. `GMHttpClient.postWithAuth` 统一"凭证等待 + 提权 + 空响应归一化"，服务层无重复链路。
4. ProjectService 的 `fetchPromise` 并发闭锁 + 结果缓存；SystemService 的 15s 探活缓存——基础设施级的防抖思路正确。
5. 全库 JSDoc 注释规范统一、质量高；`API_URLS as const` 编译期校验。
6. vite-plugin-monkey + Vue/ECharts CDN 外部化，产物仅 29.5 kB gzip。

---

## 二、扩展性瓶颈诊断（按"新增功能的摩擦成本"排序）

### 瓶颈 1｜新增一个增强模块 = 手改 5 个文件（最高优先级）
装配是**命令式**的：`main.ts` 手动 `new X().init()` + 手动 if 开关；`settings.ts` 手动加 interface + DEFAULT；`Settings.vue` 手动加模板开关 + script 回填。模块自身的 urlMatcher、黑白名单路由、样式注入 id 全部散在类内。
**没有"模块清单"这一单一事实源**——每加一个功能，5 处联动修改，且极易漏改。

### 瓶颈 2｜没有模块级生命周期（destroy 缺失）
4 个 Enhance 类只有 `init`，没有 `destroy`。SPA 路由切换后的"卸载"完全靠模块自查：
- ProjectStateEnhance 有 `cleanupAll()` + 黑白名单（做得最好）；
- BigScreen 注入的点击绑定、BarcodePrint 注入的控件组**离开页面后仍留在 DOM 上**，只能等下次拦截器触发时靠标记属性幂等跳过；
- 拦截器注册后**无 unregister 通道**，模块若被禁用，handler 与模块实例的引用无法回收。
长期运行（多页面往返）存在 DOM 残留、事件泄漏、拦截器堆积三类隐患。

### 瓶颈 3｜宿主页面知识散落在各模块内（选择器硬编码）
至少 8 处硬编码选择器串散在 3 个模块：`.el-textarea__inner`、`.el-select-dropdown__item span`、`.filters button`、`.content_box .box .right-box`、`.num-box`、`.num-1 span.num`、`.ep-menu-item`、`#app .app-wrapper .app-main .container.abs100` 等。
**宿主页面改版 = 逐模块排查选择器**。没有"页面契约层"，是扩展时最大的隐性成本。

### 瓶颈 4｜拦截器语义混用（transform 与 side-effect 不分）
MaterialInventory 的 handler 是"改数据返回新数据"（纯函数）；ProjectStateEnhance 的 handler 是"不动数据，触发 UI 注入"（副作用），且内部用 `dictPromise.then` 做 fire-and-forget 异步。两种语义挤在同一通道，`beforeRequest` 还会拖慢纯改数据的拦截链路。

### 瓶颈 5｜类型安全欠账（全库 37 处 `: any`）
`GMHttpClient.post` 返回 `any` → 各 Service 返回 `any` → View props 大量 `any`；拦截器 `handler(originalJson: any): any`。领域模型仅 3 个（`types/index.ts`）。
增量开发没有类型护栏，加代码全靠记忆，是"可持续添砖加瓦"的隐性成本。

### 瓶颈 6｜UI 层绕过服务层
`Settings.vue` 直接调 `GMHttpClient.post` 实现 ping / 触发初始化 / 轮询进度（3 条链路），绕过了 `systemService` 已有/应建的同功能方法（`ping`、`systemInt` 已存在），违反"数据服务统一走 service"约定，且与 `systemService` 的缓存逻辑重复。

### 次要项
- **双版本源**：package.json `0.1.0` vs vite.config `0.4.7`，发布时易漂移。
- **错误处理风格不一**：warn / error / toast 混用，无统一错误边界（增强脚本异常不应影响宿主页面）。
- 无 release/CI 脚本（updateURL 已指向 GitHub releases，但没有一键发布流程）。

---

## 三、优化方案（现有骨架内，不动分层）

| 优先级 | 方案 | 收益 | 成本 |
|---|---|---|---|
| **P0** | 引入 `IEnhanceModule` 契约 + `EnhanceManager` 内核（注册表/生命周期/路由裁决/错误隔离），`main.ts` 收敛为声明式装配 | 新增模块从"改 5 处"降为"1 个文件 + 1 条注册" | 1–2 天 |
| **P0** | NetworkHook 增加 `unregisterResponseInterceptor(id)`；拆分 `transform`（改数据）与 `onResponse`（副作用触发）双通道，向后兼容 | 解决泄漏隐患；语义清晰 | 0.5 天 |
| **P0** | 提取 `matchUrl(url, pattern)` 通用匹配器（支持 string/RegExp/pathname/数组），收敛 3 种 urlMatcher 写法 | 去重、少一个易错点 | 0.5 天 |
| **P1** | 新建 `host/` 页面契约层：集中全部选择器 + 语义查询函数（`getRows()`、`getSidebarMenu()`…），模块只依赖契约 | 宿主改版只改契约文件 | 2–3 天 |
| **P1** | 服务层泛型化：`post<T>` + 领域类型（PlmProjectEntity / RawWhSummary / SchdulingComp…），Service 返回强类型 | 类型护栏，增量开发有 IDE 兜底 | 1 天 |
| **P1** | Settings.vue 收敛到 service（补 `getTaskProgress`），删除直连 GMHttpClient 的三处调用 | 分层纯净 | 0.5 天 |
| **P2** | 模块 meta 携带 `{key,label,description,default}`，设置 UI 自动渲染开关 | 加开关不用改 UI | 1 天 |
| **P2** | 版本单一来源（vite.config 读取 package.json）；补 release 脚本 | 发布可靠 | 0.5 天 |

---

## 四、重构方案对比（供决策）

### 方案 A：插件化内核（Plugin Kernel）—— 推荐 ✅
在现有骨架上加一层薄内核（约 200 行 `EnhanceManager`），模块改为**清单驱动**：

```ts
interface IEnhanceModule {
  id: string;                 // 唯一标识，兼作配置键
  title: string; description: string;
  defaultEnabled: boolean;
  routes?: { match?: string[]; blacklist?: string[] };  // 路由约束，由内核裁决
  init(ctx: ModuleContext): void | Promise<void>;
  destroy?(): void;           // 路由离开/禁用时统一回收
  interceptors?: InterceptorSpec[];  // 声明式拦截器，内核统一注册/注销
  styleIds?: string[];        // 内核统一清理
}
```
- 内核职责：按开关装载 → 监听 `domMaster.onRouteChange` 做路由激活/停用 → try/catch 错误隔离 → destroy 时自动 unregister 拦截器、清理样式。
- **渐进迁移**：旧 4 个模块可先原样注册（manager 兼容裸 init），再逐个拆解为自包含目录 `modules/<name>/`。
- 风险：低–中；收益：高（解决瓶颈 1/2/6）。

### 方案 B：iframe / Shadow DOM 沙箱 —— 不推荐 ⚠️
宿主 DOM 操作（vxe 页脚重算、行匹配、菜单点击模拟）必须在主文档执行，沙箱化会把这些能力全部废掉；跨 iframe 通信复杂度远高于收益。**唯一有价值的子项**是样式隔离——但项目已统一 `hhjg-` 前缀，继续沿用即可，无需沙箱。

### 方案 C：DDD 全量分层（application/domain/infrastructure）—— 过度设计 ⚠️
当前规模 19 个 ts 文件 / 3377 行，引入完整分层是纯负担。插件化 + 契约层已覆盖约 95% 的扩展性诉求。

---

## 五、推荐路径

1. **路径 1（最小侵入）**：只做 P0 三项 → 新模块摩擦从"改 5 处"降到"改 2 处"，风险极低。
2. **路径 2（渐进重构，推荐）**：P0 → P1（host 契约层 + 类型化）→ 目录重组为 `modules/`（方案 A 全量落地）。每一步均可独立验证（typecheck + build），互不阻塞。
3. **路径 3（一步到位）**：直接按方案 A 目标结构重排 + P0/P1 全做，一次性迁移。改动面大，建议仅在版本大迭代窗口执行。

**结论**：现有架构分层质量良好，瓶颈集中在"装配层"（命令式、无清单）与"契约层"（选择器散落、类型缺失）。以方案 A 插件化内核 + host 页面契约层为演进方向，可在不推翻现有代码的前提下，把"新增一个增强"的成本降到最低。
