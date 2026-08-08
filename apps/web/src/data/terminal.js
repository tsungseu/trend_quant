// 终端（MindQuant Studio）入口地址 — 全站唯一来源。
//
// 本地开发：终端 dev server 在 5173，history 路由，入口为 /app。
// 生产构建：终端与官网同源部署在 /trend_quant/ 子路径（见 vite.config.js 的 base），
//   终端用 hash 路由，入口为 <base>#/app。绝不在生产产物里固化 localhost。
// 跨域或自定义部署：用 VITE_TERMINAL_URL 覆盖（见 apps/web/.env.example）。
const prodDefault = `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/#/app`

export const terminalUrl =
  import.meta.env.VITE_TERMINAL_URL ||
  (import.meta.env.PROD ? prodDefault : 'http://localhost:5173/app')
