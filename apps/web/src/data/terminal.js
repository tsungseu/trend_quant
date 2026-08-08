// 终端（MindQuant Studio）入口地址 — 全站唯一来源。
//
// 本地开发：终端 dev server 在 5173，history 路由，入口为 /app。
// 生产构建：web 占据站点根（base='/'），终端迁至 /terminal/ 子路径，hash 路由，
//   入口为 <pagesOrigin>/<repoPath>/terminal/#/app。
//   仓库默认部署在 https://tsungseu.github.io/trend_quant/，因此默认值为
//   /trend_quant/terminal/#/app（相对路径，随站点域名自适应）。
//   注意：web 的 BASE_URL 已改为根（/），无法再从中推导终端路径，所以这里用
//   显式常量，避免错误地拼成 /#/app。
// 跨域或自定义部署：用 VITE_TERMINAL_URL 覆盖（见 apps/web/.env.example）。

// 生产默认终端入口：GitHub Pages 仓库子路径 + /terminal/ + hash 路由 /app。
// 解耦常量，便于单测 mock；改动这里需同步 .env.example 注释。
export const PROD_DEFAULT_TERMINAL_URL = '/trend_quant/terminal/#/app'

export const terminalUrl =
  import.meta.env.VITE_TERMINAL_URL ||
  (import.meta.env.PROD ? PROD_DEFAULT_TERMINAL_URL : 'http://localhost:5173/app')
