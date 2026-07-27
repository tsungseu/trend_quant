# 趋势量化 · TrendQuant

Vite + Vue 3 量化投研终端，已接入**东方财富真实行情数据**。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 生产构建
```

## 真实数据接入说明

### 数据来源：东方财富（免费公开接口）

| 数据 | 接口 | 接入方式 | 路由 |
|------|------|---------|------|
| **基金净值** (4只: 019305/017731/019018/018230) | `api.fund.eastmoney.com/f10/lsjz` | **JSONP 直连**（无需代理） | `/funds`, `/funds/:code` |
| **股票K线** (茅台/平安/宁德等) | `push2his.eastmoney.com/api/qt/stock/kline/get` | **Vite dev proxy** | `/market` |
| **股票分时** | `push2his.eastmoney.com/api/qt/stock/trends2/get` | **Vite dev proxy** | `/market` |
| **指数快照** (上证/创业板/深证) | `push2his` K线末端派生 | **Vite dev proxy** | 顶栏 |

持仓/资产/收益为模拟数据（个人账户数据，公开接口无法获取）。

### 跨域处理

- **基金净值**：用 JSONP（`<script>` 标签）直连 `api.fund.eastmoney.com`，浏览器原生支持，**无需任何后端/代理**。
- **股票K线/分时/指数**：`push2his.eastmoney.com` 不支持跨域，开发环境用 `vite.config.js` 里的 `server.proxy` 反代 `/em-push2his` → `https://push2his.eastmoney.com`。

### ⚠️ 生产部署必须配置 nginx 反代

Vite proxy 仅开发环境有效。生产部署时需在 nginx（或其它反代）配置同样的转发，否则股票K线会因跨域失败并回退到模拟数据：

```nginx
location /em-push2his/ {
    proxy_pass https://push2his.eastmoney.com/;
    proxy_set_header Host push2his.eastmoney.com;
    proxy_set_header User-Agent "Mozilla/5.0 ... Chrome/120.0 Safari/537.36";
    proxy_set_header Referer "https://quote.eastmoney.com/";
    proxy_set_header Connection "";   # 关闭 keep-alive，避免东财 socket hang up
}
```

### 限频与兜底

- 东方财富对**高频/并发**请求会限频（返回空或 500）。代码已做：
  - 指数快照**顺序**拉取 + **60s 低频**同步 + **连续失败退避**（5 次后暂停）
  - 股票 K线请求**串行化**
- **任何接口失败都会静默回退到模拟数据**，页面不崩，数据状态标签会提示「○ 模拟数据」。
- 限频恢复通常需要 1-3 分钟。如长时间获取不到真实 K线，多半是被限频，稍候即可。

### ⚠️ 关于线上 Demo（GitHub Pages）显示"历史快照"

线上演示地址 https://tsungseu.github.io/trend_quant/ 的服务器在**美国（境外）**，东方财富/新浪的接口对境外 IP 返回 `-999` 拒绝或空数据，因此线上版会回退到内置的模拟数据，并提示「数据源对境外IP限制，显示历史快照」。

- **本地运行 `npm run dev` 可看真实数据**（你的电脑在境内 IP）
- **要让线上也看真实数据**，需自建一个**境内/无地域限制的代理**（如 Cloudflare Worker、阿里云/腾讯云函数、境内 VPS），把东财请求转发出去。代理部署好后，在 `src/api/eastmoney.js` 里把直连 URL 改成代理 URL 即可。

## 文件结构

```
src/
├── api/eastmoney.js      # 东方财富数据层（JSONP + proxy fetch）
├── stores/
│   ├── funds.js          # 基金 store（真实净值 + 兜底）
│   ├── market.js         # 行情 store（真实K线/分时/指数 + 兜底）
│   └── ...
├── mock/
│   ├── funds.js          # 基金元信息 + 兜底序列生成器
│   ├── indicators.js     # MA/RSI/回撤/买卖信号引擎
│   └── ...
└── views/
    ├── FundsListView.vue / FundDetailView.vue
    ├── MarketView.vue
    └── ...
```

## 功能模块

资产总览 · 行情看盘(K线/分时) · 量化策略(含回测) · 持仓与交易 · **基金量化(买卖信号)** · 预警中心 · AI投顾 · 回测编辑器 · 资讯流 · 深/浅双主题切换
