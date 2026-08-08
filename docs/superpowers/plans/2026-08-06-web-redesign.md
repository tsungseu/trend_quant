# TrendQuant Web Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已确认规格，先产出 Figma 原型，再将仓库重构为 `apps/web` + `apps/terminal` monorepo，落地混合视觉设计系统与一期核心页面，全部在 `feature/web-redesign` 上分 PR 合并，不直接改 `main`。

**Architecture:** npm workspaces monorepo。`packages/design-tokens` 与 `packages/ui` 共享给营销站与终端。`apps/web` 为 Vue 3 + Vite 营销站（MarketingLayout）；`apps/terminal` 为现有投研终端迁入（AppShell，路由前缀 `/app`，迁移期保留旧路径重定向）。GitHub Pages 一期继续部署 terminal 产物；web 可本地/后续子路径部署。

**Tech Stack:** Vue 3, Vite 5, Vue Router 4, Pinia, Sass, ECharts（终端）, Vitest, npm workspaces, Figma MCP（原型）

**Spec:** `docs/superpowers/specs/2026-08-06-web-redesign-design.md`

**Out of this plan (follow-up plans):** 真实支付、数仓后端、实盘券商、完整 CMS；代码侧 PR4+（知识库内容骨架深化、数据平台工作台、会员权限）另开计划。

---

## File structure (target)

```
trend_quant/
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── src/
│   │       ├── main.js
│   │       ├── App.vue
│   │       ├── router/index.js
│   │       ├── layouts/MarketingLayout.vue
│   │       ├── styles/marketing.scss
│   │       └── views/
│   │           ├── HomeView.vue
│   │           ├── ProductsView.vue
│   │           ├── ProductDetailView.vue
│   │           ├── PricingView.vue
│   │           ├── DocsView.vue
│   │           └── AboutView.vue
│   └── terminal/          # 现有根目录 src/ 等迁入
│       ├── index.html
│       ├── package.json
│       ├── vite.config.js
│       ├── vitest.config.js
│       └── src/           # 原 src/
├── packages/
│   ├── design-tokens/
│   │   ├── package.json
│   │   ├── index.css      # CSS 变量（marketing + terminal themes）
│   │   └── tokens.scss
│   └── ui/
│       ├── package.json
│       ├── index.js
│       └── src/
│           ├── TqButton.vue
│           ├── TqNavLink.vue
│           └── TqStat.vue
├── docs/superpowers/
├── package.json           # workspaces root
└── .github/workflows/deploy.yml
```

---

### Task 0: Figma 原型（规格 §5.3）

**Files:**
- Create: Figma 文件 `TrendQuant Web Redesign`（通过 Figma MCP）
- Update: `docs/superpowers/specs/2026-08-06-web-redesign-design.md`（追加 Figma 链接）

- [ ] **Step 1: 加载 Figma 技能并创建文件**

使用 skill：`figma-create-new-file`，然后 `figma-use` / `figma-generate-design`。  
调用 MCP `create_new_file`，`editorType: design`，`fileName: TrendQuant Web Redesign`。

- [ ] **Step 2: 建立 Design Tokens 页**

在 Figma 中创建页面 `01 Tokens`，定义：

- Color styles：`bg/base-dark` `#0b0f1a`，`bg/hero` `#070b14→#142033`，`bg/paper` `#f6f4f1`，`brand/primary` `#3b82f6`，`text/primary-dark` `#e6ebf5`，`text/primary-light` `#0f172a`，`up` `#ef4444`，`down` `#22c55e`
- Text styles：Display / Title / Body / Caption / Mono（展示字体非 Inter）
- Spacing：4 / 8 / 12 / 16 / 24 / 32 / 40 / 64
- 组件态：Button primary/secondary/ghost（default、hover、disabled）

- [ ] **Step 3: 绘制营销页（Desktop 1440）**

页面 `02 Marketing`：

1. **Home** — 深色全出血英雄区：品牌 `TrendQuant`、主标题「可靠的量化投研系统，服务关键决策」、一句支撑、双 CTA（进入终端 / 查看产品）；下方浅色内容区各一节（策略、数据、交易、知识），每节一个标题 + 一句支撑，无卡片堆叠
2. **Products** — 四象限入口（策略 / 数据 / 交易 / AI 投研）
3. **Pricing** — 三档：免费 / 专业 / 机构（权益表，无支付控件）
4. **Docs** — 知识库入口三列：教程 / 策略说明 / API

- [ ] **Step 4: 绘制终端页（Desktop 1440）**

页面 `03 Terminal`：

1. **App Shell** — 左侧可展开导航、顶栏、主内容槽
2. **Overview** — 资产摘要、信号、预警（工作台密度，非营销）
3. **Strategies list + detail** — 列表卡片/行 + 详情（回测摘要、信号）
4. **灰框预留** — Data Platform / Membership（标注 Phase 2+）

- [ ] **Step 5: 关键页补 Mobile 帧（390 宽）**

至少：Home、Pricing、App Shell。

- [ ] **Step 6: 把 Figma 链接写入规格并提交**

在规格文首增加：

```markdown
**Figma:** https://www.figma.com/design/<fileKey>/TrendQuant-Web-Redesign
```

```bash
git add docs/superpowers/specs/2026-08-06-web-redesign-design.md
git commit -m "docs: link Figma prototype for web redesign"
```

**Gate:** 用户走查 Figma 并回复确认后，再开始 Task 1。

**Amendment (2026-08-06):** 用户接受现有 Figma（`01 Tokens` + `02 Marketing`）。`03 Terminal` 与 Mobile 帧**不再补 Figma**；后续终端/壳层视觉对标 [Scale.com](https://scale.com/) 与 [BigQuant.com](https://bigquant.com/) 网页气质，并结合规格 §4 与已有 Tokens 落地。

---

### Task 1: Root workspace + design-tokens 包

**Files:**
- Create: `package.json`（root workspaces；保留脚本转发）
- Create: `packages/design-tokens/package.json`
- Create: `packages/design-tokens/index.css`
- Create: `packages/design-tokens/tokens.scss`
- Modify: 暂不移动 `src/`（下一任务）

- [ ] **Step 1: 写入 root `package.json` workspaces**

将现有根 `package.json` 改为 workspace 根（先备份依赖意图；terminal 包会带走 vue 等依赖）：

```json
{
  "name": "trendquant-monorepo",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:web": "npm run dev -w @trendquant/web",
    "dev:terminal": "npm run dev -w @trendquant/terminal",
    "build": "npm run build -w @trendquant/terminal",
    "build:web": "npm run build -w @trendquant/web",
    "build:all": "npm run build -w @trendquant/web && npm run build -w @trendquant/terminal",
    "test:unit": "npm run test:unit -w @trendquant/terminal",
    "check": "npm run check -w @trendquant/terminal"
  }
}
```

- [ ] **Step 2: 创建 `packages/design-tokens`**

`packages/design-tokens/package.json`：

```json
{
  "name": "@trendquant/design-tokens",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "index.css",
  "exports": {
    ".": "./index.css",
    "./tokens.scss": "./tokens.scss",
    "./index.css": "./index.css"
  }
}
```

`packages/design-tokens/index.css` 包含 marketing 与 terminal 两套 CSS 变量（从现有 `src/styles/tokens.scss` 迁移并扩展 `--bg-paper`、`--hero-gradient` 等）。`tokens.scss` 继续用 SCSS 变量转发 `var(--*)`，与现网模式一致。

- [ ] **Step 3: 安装并确认 workspace 识别**

```bash
npm install
npm ls -w @trendquant/design-tokens
```

Expected: 包出现在 workspaces 列表，无缺依赖报错（此时 apps 可能尚未齐，允许暂时只有 packages）。

- [ ] **Step 4: Commit**

```bash
git add package.json packages/design-tokens package-lock.json
git commit -m "chore: add npm workspaces and design-tokens package"
```

---

### Task 2: `packages/ui` 基础组件

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/index.js`
- Create: `packages/ui/src/TqButton.vue`
- Create: `packages/ui/src/TqNavLink.vue`
- Create: `packages/ui/src/TqStat.vue`

- [ ] **Step 1: 包清单**

```json
{
  "name": "@trendquant/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "index.js",
  "exports": {
    ".": "./index.js"
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "vue-router": "^4.4.0"
  },
  "dependencies": {
    "@trendquant/design-tokens": "0.1.0"
  }
}
```

- [ ] **Step 2: 实现 `TqButton.vue`**

Props：`variant: 'primary' | 'secondary' | 'ghost'`，`size: 'md' | 'lg'`，`href` 可选（有则渲染 `<a>`）。样式只用 tokens 变量，无硬编码紫渐变。

- [ ] **Step 3: 实现 `TqNavLink.vue` 与 `TqStat.vue`**

`TqNavLink`：基于 `RouterLink` 或 `<a>`，`active` class。  
`TqStat`：label + value + optional delta（涨跌色用 `--up` / `--down`）。

- [ ] **Step 4: `index.js` 导出**

```js
export { default as TqButton } from './src/TqButton.vue'
export { default as TqNavLink } from './src/TqNavLink.vue'
export { default as TqStat } from './src/TqStat.vue'
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): add shared Button, NavLink, and Stat components"
```

---

### Task 3: 迁入 `apps/terminal`（保持行为不变）

**Files:**
- Move: 根目录 `src/` → `apps/terminal/src/`
- Move: `index.html` → `apps/terminal/index.html`
- Move: `vite.config.js` → `apps/terminal/vite.config.js`
- Move: `vitest.config.js` → `apps/terminal/vitest.config.js`
- Move: `public/` → `apps/terminal/public/`
- Create: `apps/terminal/package.json`（原依赖迁入）
- Modify: `.github/workflows/deploy.yml`（在 `apps/terminal` 构建，artifact 指向其 `dist`）
- Modify: `apps/terminal/src/styles/tokens.scss`（改为 import `@trendquant/design-tokens`）

- [ ] **Step 1: 创建 terminal package 并移动文件**

`apps/terminal/package.json` name：`@trendquant/terminal`，scripts 与现网一致（`dev`/`build`/`test:unit`/`check`），dependencies 含 vue/pinia/vue-router/echarts 等及 `@trendquant/design-tokens`、`@trendquant/ui`。

使用 `git mv` 移动 `src`、`index.html`、`vite.config.js`、`vitest.config.js`、`public`，保留历史。

- [ ] **Step 2: 修正 Vite alias 与 tokens 引用**

`vite.config.js` 中 `@` → `apps/terminal/src`。  
`main.js` / `base.scss` 改为：

```scss
@use '@trendquant/design-tokens/tokens.scss' as *;
```

或 CSS：`import '@trendquant/design-tokens/index.css'`。

- [ ] **Step 3: 更新 GitHub Pages workflow**

```yaml
- name: Install
  run: npm ci
- name: Build
  run: npm run build -w @trendquant/terminal
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: apps/terminal/dist
```

- [ ] **Step 4: 运行验证**

```bash
npm install
npm run test:unit -w @trendquant/terminal
npm run build -w @trendquant/terminal
```

Expected: 测试通过；`apps/terminal/dist` 生成。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move terminal app into apps/terminal workspace"
```

---

### Task 4: 终端路由 `/app` 前缀 + 旧路径重定向

**Files:**
- Modify: `apps/terminal/src/router/index.js`
- Test: `apps/terminal/src/router/redirects.test.js`（新建）

- [ ] **Step 1: 写失败测试 — 旧路径重定向**

```js
import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { buildRoutes } from './index.js' // 若需导出纯函数则先抽出 routes 工厂

describe('legacy redirects', () => {
  it('redirects /strategies to /app/strategies', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push('/strategies')
    expect(router.currentRoute.value.fullPath).toBe('/app/strategies')
  })
})
```

若当前 `index.js` 未导出 `buildRoutes`，本步先抽出：

```js
export function buildRoutes() {
  return [
    { path: '/', redirect: '/app' },
    { path: '/app', name: 'overview', component: () => import('@/views/OverviewView.vue'), meta: { title: '资产总览' } },
    // ... 其余业务路由全部挂在 /app/*
    { path: '/strategies', redirect: '/app/strategies' },
    { path: '/market', redirect: '/app/market' },
    // 对每个旧 path 增加 redirect
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ]
}
```

- [ ] **Step 2: 跑测试确认失败或实现后通过**

```bash
npm run test:unit -w @trendquant/terminal
```

- [ ] **Step 3: 更新 `AppSidebar.vue` / `AppTopbar.vue` 链接为 `/app/...`**

- [ ] **Step 4: 再跑 `check` 并提交**

```bash
npm run check -w @trendquant/terminal
git add apps/terminal
git commit -m "feat(terminal): nest routes under /app with legacy redirects"
```

---

### Task 5: 创建 `apps/web` 营销站骨架

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.js`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.js`
- Create: `apps/web/src/App.vue`
- Create: `apps/web/src/router/index.js`
- Create: `apps/web/src/layouts/MarketingLayout.vue`
- Create: `apps/web/src/styles/marketing.scss`
- Create: `apps/web/src/views/HomeView.vue`
- Create: `apps/web/src/views/ProductsView.vue`
- Create: `apps/web/src/views/ProductDetailView.vue`
- Create: `apps/web/src/views/PricingView.vue`
- Create: `apps/web/src/views/DocsView.vue`
- Create: `apps/web/src/views/AboutView.vue`

- [ ] **Step 1: Vite Vue 应用脚手架**

`@trendquant/web` 依赖：`vue`、`vue-router`、`@trendquant/design-tokens`、`@trendquant/ui`、`sass`。  
`vite.config.js` port `5174`，alias `@` → `src`。

- [ ] **Step 2: `MarketingLayout.vue`**

顶栏：Logo `TrendQuant` + 导航（产品、价格、知识库、关于）+ `TqButton`「进入终端」链到 terminal 的 `/app`（开发期可用 `http://localhost:5173/app`，生产用相对/配置 `VITE_TERMINAL_URL`）。

- [ ] **Step 3: 路由表**

```js
{
  path: '/',
  component: MarketingLayout,
  children: [
    { path: '', name: 'home', component: HomeView },
    { path: 'products', name: 'products', component: ProductsView },
    { path: 'products/:slug', name: 'product-detail', component: ProductDetailView },
    { path: 'pricing', name: 'pricing', component: PricingView },
    { path: 'docs/:section?', name: 'docs', component: DocsView },
    { path: 'about', name: 'about', component: AboutView },
  ],
}
```

`slug` ∈ `strategies | data | trading | research`。

- [ ] **Step 4: HomeView 按 Figma 实现首屏**

结构约束（对照规格 §4）：

1. 深色全出血英雄区：品牌、一主标题、一支撑句、CTA 组  
2. 浅色内容区：四节，每节一标题 + 一句支撑  
3. 页脚：免责声明「研究工具，非投资建议」

- [ ] **Step 5: Products / Pricing / Docs / About 最小可用页**

Pricing：三档静态权益表（Free / Pro / Institution），按钮文案「开始使用」→ 终端，无支付表单。  
Docs：三入口链到锚点或静态章节。  
About：产品说明 + 免责声明。

- [ ] **Step 6: 验证**

```bash
npm run build -w @trendquant/web
npm run dev -w @trendquant/web
```

Expected: build 成功；本地打开首页可见英雄区与导航。

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add marketing site with home, products, pricing, docs"
```

---

### Task 6: 终端 App Shell 视觉对齐 Figma

**Files:**
- Modify: `apps/terminal/src/components/AppSidebar.vue`
- Modify: `apps/terminal/src/components/AppTopbar.vue`
- Modify: `apps/terminal/src/App.vue`
- Modify: `apps/terminal/src/styles/base.scss`

- [ ] **Step 1: 对照 Figma App Shell 调整侧栏**

- 导航分组：投研（总览/行情/策略）· 组合（持仓/交易）· 工具（基金/预警/投顾/回测/资讯）· 数据（预留 `/app/data` 入口，可 `comingSoon`）
- 使用 tokens；去掉 glow 阴影

- [ ] **Step 2: 顶栏**

保留主题切换与字号；品牌区与 Figma 一致；展示数据模式徽章（demo/direct/proxy）不删除。

- [ ] **Step 3: 验证与提交**

```bash
npm run check -w @trendquant/terminal
git add apps/terminal
git commit -m "feat(terminal): restyle app shell to match redesign tokens"
```

---

### Task 7: 总览与策略页按新设计落地

**Files:**
- Modify: `apps/terminal/src/views/OverviewView.vue`
- Modify: `apps/terminal/src/views/StrategyListView.vue`
- Modify: `apps/terminal/src/views/StrategyDetailView.vue`
- Modify: `apps/terminal/src/components/StatCard.vue`（或改为使用 `TqStat`）
- Modify: `apps/terminal/src/components/StrategyCard.vue`
- Test: 现有 `AdvisorView` 等测试不得被破坏；必要时为 Overview 增加冒烟测试

- [ ] **Step 1: Overview 信息架构**

按 Figma：上排关键指标（`TqStat`），中部信号/持仓摘要，右侧或下方预警；保持数据质量提示可见。

- [ ] **Step 2: Strategy list/detail**

列表：策略名、状态、关键收益/回撤；详情：摘要 + 图表区（沿用 EChart）+ 信号列表。不删现有业务逻辑，只改布局与样式。

- [ ] **Step 3: 跑全量 check**

```bash
npm run check -w @trendquant/terminal
npm run build -w @trendquant/web
```

Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add apps/terminal
git commit -m "feat(terminal): redesign overview and strategy views"
```

---

### Task 8: 手测清单、规格勾选、开 PR

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-web-redesign-design.md`（勾选 §8 已完成项）
- Create: PR via `gh`（base `main`，head `feature/web-redesign`）

- [ ] **Step 1: 手测清单**

| # | 路径 | 期望 |
|---|------|------|
| 1 | web `/` | 英雄区品牌清晰，双 CTA |
| 2 | web `/products` `/pricing` `/docs` `/about` | 可导航，无支付 |
| 3 | terminal `/app` | 总览可用 |
| 4 | terminal `/strategies` | 重定向到 `/app/strategies` |
| 5 | demo 模式 | 无错误第三方请求；质量徽章在 |
| 6 | `npm run check` | 通过 |

- [ ] **Step 2: Push 并创建 PR**

```bash
git push -u origin HEAD
gh pr create --title "feat: TrendQuant web redesign (marketing + terminal monorepo)" --body "$(cat <<'EOF'
## Summary
- Figma-aligned marketing site (`apps/web`) and shared design tokens/UI
- Terminal moved to `apps/terminal` with `/app` routes and legacy redirects
- Overview & strategy views restyled; Pages build still targets terminal

## Test plan
- [ ] `npm run check -w @trendquant/terminal`
- [ ] `npm run build -w @trendquant/web`
- [ ] Manual: web home/products/pricing; terminal `/app` and legacy redirect
- [ ] Confirm demo mode disclaimer and data-quality badges remain

EOF
)"
```

- [ ] **Step 3: 将 PR URL 回复用户**

---

## Spec coverage checklist

| Spec 项 | Task |
|---------|------|
| Figma 交付物 §5.3 | Task 0 |
| Monorepo 结构 §5.1 | Task 1–5 |
| design-tokens / ui §4.3 | Task 1–2 |
| 营销 IA §3.1 | Task 5 |
| 终端 `/app` + 重定向 §3.2 | Task 4 |
| App Shell / 总览 / 策略一期页 | Task 6–7 |
| 保留数据模式与免责 §6 | Task 3、6、8 |
| 分 PR / 不污染 main §5.2 | 全程在 `feature/web-redesign`；Task 8 开 PR |
| PR4+ 知识库深化/数据平台/支付 | **不在本计划**（另开计划） |

---

## Self-review notes

- 无 TBD：营销站栈定为 **Vue 3 + Vite**（与 terminal 共享 SFC/`@trendquant/ui`）。
- Workspace 工具定为 **npm workspaces**（已有 `package-lock.json`）。
- Task 0 设用户 Gate，避免未确认设计即大改代码。
- PR4+ 明确排除，防止范围膨胀。
