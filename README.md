# 趋势量化 · TrendQuant

Vite + Vue 3 量化投研终端，提供基金量化信号、行情看盘、预警中心、回测编辑器等模块。

> ⚠️ 本项目页面所有"模型信号""价格提醒"仅用于量化研究和提醒，**不构成投资建议**。模型基于历史数据计算，不保证未来表现。

## 快速开始

```bash
npm install
npm run dev        # 本地开发：http://localhost:5173
npm run test:unit  # 运行单元测试（Vitest）
npm run build      # 生产构建
npm run check      # 测试 + 构建 一键校验
npm run preview    # 本地预览生产构建
```

## 数据模式（重要）

为了区分"真实数据 / 缓存 / 历史快照 / 模拟"，并通过环境隔离第三方 JSONP 风险，项目通过环境变量 `VITE_DATA_MODE` 选择三种运行模式：

| 模式 | 说明 | 是否请求第三方接口 | 默认使用场景 |
|------|------|------------------|------------|
| `demo` | 仅使用内置历史快照/mock 数据，所有真实数据接口返回不可用 | 否 | GitHub Pages 生产、对外演示 |
| `direct` | 浏览器直接请求东方财富/腾讯/新浪的 JSONP/script 接口 | 是（需 `VITE_ALLOW_THIRD_PARTY_SCRIPTS=true`） | 本地开发、自用研究 |
| `proxy` | 通过自建/边缘代理获取真实数据（推荐生产） | 是，但走自有网关 | 自部署生产环境 |

**默认值**：

- `import.meta.env.PROD === true` 时默认 `demo`
- 否则（本地开发）默认 `direct`

复制 `.env.example` 为 `.env` 并按需调整，关键变量：

```env
VITE_DATA_MODE=demo            # demo / direct / proxy
VITE_DATA_PROXY_BASE=          # proxy 模式必填，例：https://your-worker.example.com
VITE_ALLOW_THIRD_PARTY_SCRIPTS=false  # direct 模式必填 true
VITE_ENABLE_MOCK_LIVE=false    # 是否启用模拟行情跳动动画
VITE_PUBLIC_BASE=/trend_quant/ # Vite publicBase 子路径
```

## 关于 GitHub Pages 演示

线上 GitHub Pages 部署默认为 **demo 模式**：

- 不会请求任何 `/em-*` Vite dev proxy（dev proxy 仅本地有效）。
- 不会在浏览器执行第三方 JSONP/script，除非显式开启 `VITE_ALLOW_THIRD_PARTY_SCRIPTS=true`。
- 页面会明确标注"演示快照模式 / 历史快照 / 数据不可用"，不会把快照伪装成实时行情。
- 模拟/快照数据**不会触发真实价格提醒**。

如果想让线上看到真实数据：

1. 推荐做法：自建一个数据代理（Cloudflare Worker / Vercel Edge / 境内 Node 网关等），实现 `.env.example` 列出的 `/fund/*`、`/market/*` 接口；然后把 `VITE_DATA_MODE=proxy`、`VITE_DATA_PROXY_BASE=<你的网关>` 配到 GitHub Pages 的构建环境。
2. 自用研究可临时开启 `direct` + `VITE_ALLOW_THIRD_PARTY_SCRIPTS=true`，但需注意 JSONP/script-tag 等同于执行第三方脚本，存在风险。

## JSONP / 第三方脚本安全说明

- 所有 JSONP/script 注入都经过统一的安全 loader：
  - 成功 / 失败 / 超时都会移除 `<script>`。
  - 超时后保留短暂空回调，避免迟到响应抛 `ReferenceError`。
  - 请求域名做了白名单限制（仅允许 `api.fund.eastmoney.com`、`fundsuggest.eastmoney.com`、`qt.gtimg.cn`、`stock.finance.sina.com.cn`）。
- 默认生产环境禁用第三方脚本；`direct` 模式需要显式 `VITE_ALLOW_THIRD_PARTY_SCRIPTS=true`。

## 数据质量模型

每个外部数据块都带统一的元信息，UI 不再靠"数组是否为空"推断真实/模拟：

```js
{
  data,        // 实际数据
  source,      // eastmoney | tencent | sina | gateway | mock | local
  quality,     // verified | delayed | eod | cached | derived | estimated | mock | unavailable
  asOf,        // 数据时间点
  fetchedAt,   // ISO 时间戳
  updatedAt,   // 展示用更新时间
  isFallback,  // 是否回退
  error,       // 错误信息
}
```

- **价格提醒**：只接受 `verified / delayed / eod / cached / estimated` 且新鲜（≤10 分钟，或 EOD）的数据触发，mock / unavailable / 过期数据不会触发真实提醒。
- **模型信号**：基于可靠净值计算；快照/mock 数据下仍会显示，但会标注"历史样例观察"。
- **阈值状态机**：持续命中同一阈值不会重复刷屏，必须先离开阈值再触发。

## 验证

```bash
npm run test:unit   # Vitest 单测
npm run build       # 生产构建
npm run preview -- --host 127.0.0.1 --port 4173
```

浏览器关键路径验证：

- `/`（或 hash 模式 `/trend_quant/#/`）
- `/funds`、`/funds/019305`
- `/market`
- `/alerts`
- 一个不存在的路径应进入 404 页

重点确认：

- 构建通过，无 `NaN%` / `undefined` 渲染。
- 基金刷新按钮会真正重新拉取（force）。
- demo 模式下不会请求 `/em-*`。
- mock/快照不会触发真实价格提醒。

## 文件结构

```
src/
├── api/
│   ├── eastmoney.js        # 东方财富/腾讯/新浪数据层（含安全 JSONP）
│   └── dataClient.js       # 业务层统一入口，按运行模式路由
├── config/
│   └── runtime.js          # 运行模式、代理基址、开关集中管理
├── utils/
│   ├── dataQuality.js      # 数据质量模型与判断
│   └── storage.js          # localStorage schema 校验与兜底
├── stores/
│   ├── funds.js            # 基金 store（净值/估值/重仓股/档案 + 数据质量）
│   ├── market.js           # 行情 store（K线/分时/指数快照 + 数据质量）
│   └── alerts.js           # 预警 store（阈值状态机 + 新鲜度校验）
├── mock/                   # 历史快照与指标计算（demo/fallback）
│   ├── funds.js
│   ├── market.js
│   ├── indicators.js       # MA/RSI/回撤/买卖信号引擎
│   └── _helpers.js         # 格式化与随机工具（NaN 兜底）
└── views/
    ├── FundsListView.vue / FundDetailView.vue
    ├── MarketView.vue
    ├── AlertsView.vue
    └── NotFoundView.vue    # 404
```

## 功能模块

资产总览 · 行情看盘(K线/分时) · 量化策略(含回测) · 持仓与交易 · 基金量化(模型观察 + 价格提醒) · 预警中心 · AI 投顾 · 回测编辑器 · 资讯流 · 深/浅双主题切换
