# TrendQuant Web 重设计规格

**日期：** 2026-08-06  
**状态：** 已确认（2026-08-06）  
**分支：** `feature/web-redesign`  
**Figma：** https://www.figma.com/design/iQ30fAE70GqbQ71hoR1vag/TrendQuant-Web-Redesign  
**参考：** [Scale.com](https://scale.com/) 视觉气质 · [BigQuant](https://bigquant.com/) 产品功能矩阵

---

## 1. 背景与目标

TrendQuant（`tsungseu/trend_quant`）是 Vite + Vue 3 量化投研终端，现有模块包括：资产总览、行情、策略、持仓、交易、基金、预警、AI 投顾、回测、资讯、设置。当前 UI 为深色侧栏终端，缺少对外品牌叙事与平台级信息架构。

**目标：** 将产品升级为「营销站 + 投研终端」双层一体平台，视觉对标 Scale 的品牌感与留白，功能叙事对标 BigQuant（量化策略、数据平台、量化交易、知识库、价格），以完整平台为终局，设计先行、代码分 PR 落地，避免直接污染 `main`。

**非目标（一期不做真实实现）：**

- 真实支付 / 订阅扣款
- 完整数据平台后端与 PB 级数仓
- 实盘券商对接
- 知识库完整 CMS 后台（可用静态 / Markdown 骨架）

---

## 2. 已确认决策

| 决策点 | 选择 |
|--------|------|
| 改版范围 | 双层一体：营销官网 + 产品内终端，同一设计系统 |
| 一期 Figma 必做页 | 官网首页、产品矩阵、价格页、终端 App Shell、总览、策略列表/详情 |
| 视觉方向 | 混合品牌系统：官网深色英雄区 + 浅色内容区；终端深色优先 |
| 功能深度 | 终局为完整平台；推进方式为「设计先行、代码分 PR」 |
| 技术方案 | 双应用 monorepo（`apps/web` + `apps/terminal` + 共享 packages） |

---

## 3. 信息架构

### 3.1 `apps/web` · 营销站

| 路径 | 页面 | 职责 |
|------|------|------|
| `/` | 首页 | Scale 式混合英雄区：品牌、主标题、一句支撑、CTA、全出血视觉 |
| `/products` | 产品矩阵总览 | BigQuant 式能力入口 |
| `/products/strategies` | 量化策略 | 策略能力说明 → CTA 进终端策略模块 |
| `/products/data` | 数据平台 | 数据能力叙事（终局工作台在终端） |
| `/products/trading` | 量化交易 | 模拟/研究交易叙事 |
| `/products/research` | AI 投研 | 投顾 / 回测 / 资讯能力 |
| `/pricing` | 价格 | 免费 / 专业 / 机构档位与权益对照（无支付） |
| `/docs` | 知识库入口 | 教程、策略说明、API/数据文档入口 |
| `/docs/guides` | 教程 | |
| `/docs/strategies` | 策略说明 | |
| `/docs/api` | 数据 / API | |
| `/about` | 关于 / 免责声明 | 研究工具定位，非投资建议 |

主导航：产品 · 价格 · 知识库 · 关于 · **进入终端**。

### 3.2 `apps/terminal` · 投研终端

现有能力迁入 `/app` 前缀（迁移期保留旧路由重定向）：

| 路径 | 说明 |
|------|------|
| `/app` | 总览 Dashboard |
| `/app/market` | 行情 |
| `/app/strategies` · `/app/strategies/:id` | 策略列表 / 详情 |
| `/app/data` | 数据平台工作台（新，终局能力） |
| `/app/funds` · `/app/funds/:code` | 基金量化 |
| `/app/holdings` | 持仓 |
| `/app/trades` | 交易记录 |
| `/app/alerts` | 预警 |
| `/app/advisor` | AI 投顾 |
| `/app/backtest` | 回测编辑器 |
| `/app/news` | 资讯 |
| `/app/docs` | 终端内知识库 |
| `/app/settings` | 设置 / 会员权益展示 |

**原则：** 营销站讲「为什么用 / 买什么」；终端做「怎么用」。产品四象限对齐 BigQuant：策略 · 数据 · 交易 · 知识/成长。

---

## 4. 视觉与设计系统

### 4.1 品牌方向

- **官网英雄区：** 深色渐变底、强排版、少装饰、品牌名作为首屏主信号之一。
- **官网内容区：** 浅色暖灰纸感底、大留白、单栏目叙事（一节一件事）。
- **终端：** 深色高密度面板、细边框分层、红涨绿跌不变。
- **动效：** 2–3 处有意图（英雄区入场、导航指示、关键指标刷新），无装饰性噪点。

### 4.2 Design Tokens（共享）

- **色彩：** 冷蓝品牌色（由现有 `#3b82f6` 系演进）；避免紫渐变套路；涨跌红/绿；浅色底非奶油模板风。
- **字体：** 展示用有性格的无衬线（Geist / 同类）；正文与数据用 UI 字体；禁用 Inter / Roboto / Arial 作为主展示栈。
- **布局：** 官网首屏仅品牌 + 一句主标题 + 一句支撑 + CTA 组 + 全出血视觉；终端首屏是工作台。
- **组件：** 营销默认少用卡片；终端可用面板，避免多层阴影与 glow。

### 4.3 共享包

- `packages/design-tokens` — 色板、间距、字号、语义色
- `packages/ui` — Button、Nav、Stat、Table 等基础件（web / terminal 共用）

---

## 5. 仓库结构与交付节奏

### 5.1 目标结构

```
trend_quant/
├── apps/
│   ├── web/                 # 营销站（Astro 或 Vite+Vue SSG，实现计划阶段敲定）
│   └── terminal/            # 现有 Vue 终端迁入
├── packages/
│   ├── design-tokens/
│   └── ui/
├── docs/superpowers/specs/  # 本规格与后续计划
├── .github/workflows/
└── package.json             # pnpm / npm workspaces
```

### 5.2 分支与 PR

| 步骤 | 内容 |
|------|------|
| 基线 | 从 `main` 拉 `feature/web-redesign`，所有改动只进该分支线 |
| PR0 | 本设计规格 +（后续）Figma 链接 |
| PR1 | monorepo 脚手架 + tokens/ui + 营销站骨架 |
| PR2 | 终端迁入 `apps/terminal` + App Shell 视觉重构 + `/app` 路由 |
| PR3 | 总览 / 策略页按新设计落地 |
| PR4+ | 知识库骨架 → 数据平台工作台 → 价格/权限展示 |

每个 PR 必须通过现有（或等价）`check`（单测 + build）后再请求合并；`main` 只收已验证 PR。

### 5.3 Figma / 视觉参考交付物

**已交付（Figma）：** https://www.figma.com/design/iQ30fAE70GqbQ71hoR1vag/TrendQuant-Web-Redesign  
含 Tokens、Button 变体、营销 Desktop（Home / Products / Pricing / Docs）。

**修订（2026-08-06）：** 终端 App Shell / 总览 / 策略 / Mobile **不再补 Figma**。实现时对标 [Scale.com](https://scale.com/) 与 [BigQuant.com](https://bigquant.com/) 网页视觉与信息密度，并复用 Figma Tokens 与规格 §4。

---

## 6. 约束与兼容

- 保留数据质量模型与 `demo` / `direct` / `proxy` 模式；合规与「非投资建议」提示不得因视觉重构丢失。
- GitHub Pages：可先继续部署 terminal；web 可用子路径或后续自定义域；迁移方案写进对应 PR 说明。
- 价格/会员在原型与前端展示层实现；不接真实支付与实盘撮合。
- 不提交密钥；沿用现有 `.env.example` 约定。

---

## 7. 风险与对策

| 风险 | 对策 |
|------|------|
| Monorepo 迁移打断 Pages 路径 | 保留旧构建入口或重定向；配置变更写入 PR |
| 终局范围膨胀 | Figma 灰框标二期；代码严格按 PR 切片 |
| 营销与终端视觉分裂 | 强制共享 tokens/ui；评审对照本规格 §4 |
| 路由前缀导致书签失效 | 迁移期双路由兼容 + 友好 404 |

---

## 8. 一期成功标准

- [x] Figma：首页 / 产品 / 价格 / 知识库入口可走查，tokens 齐全（Terminal/Mobile 帧按修订改为对标 Scale/BigQuant 落地）
- [x] 代码：`feature/web-redesign` 上具备营销站 + 终端 monorepo 可运行预览；`main` 未被直接污染
- [x] 体验：官网首屏品牌清晰；终端密度可用；数据质量与免责提示仍在
- [x] 验证：单元测试 + build 通过；关键路径手测清单见 PR

---

## 9. 批准后下一步

1. 用户审查并确认本规格文件  
2. 调用 Figma 工具产出可点击原型（§5.3）  
3. 编写实现计划（writing-plans），再按 PR 切片重构并在验证后提交 PR  

---

## 10. 决策记录（摘要）

- 范围：C 双层一体  
- 一期页面：推荐组合（首页、产品、价格、Shell、总览、策略）  
- 视觉：B 混合品牌系统  
- 终局：完整平台；推进：A 设计先行分 PR  
- 技术：方案 2 双应用 monorepo  
