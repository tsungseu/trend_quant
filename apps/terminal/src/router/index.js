import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

export function buildRoutes() {
  return [
    {
      path: '/app',
      name: 'overview',
      component: () => import('@/views/OverviewView.vue'),
      meta: { title: '资产总览' },
    },
    {
      path: '/app/market',
      name: 'market',
      component: () => import('@/views/MarketView.vue'),
      meta: { title: '行情看盘' },
    },
    {
      path: '/app/strategies',
      name: 'strategies',
      component: () => import('@/views/StrategyListView.vue'),
      meta: { title: '量化策略' },
    },
    {
      path: '/app/strategies/:id',
      name: 'strategy-detail',
      component: () => import('@/views/StrategyDetailView.vue'),
      meta: { title: '策略详情' },
    },
    {
      path: '/app/holdings',
      name: 'holdings',
      component: () => import('@/views/HoldingsView.vue'),
      meta: { title: '我的持仓' },
    },
    {
      path: '/app/trades',
      name: 'trades',
      component: () => import('@/views/TradesView.vue'),
      meta: { title: '交易记录' },
    },
    {
      path: '/app/alerts',
      name: 'alerts',
      component: () => import('@/views/AlertsView.vue'),
      meta: { title: '预警中心' },
    },
    {
      path: '/app/advisor',
      name: 'advisor',
      component: () => import('@/views/AdvisorView.vue'),
      meta: { title: 'AI 投顾' },
    },
    {
      path: '/app/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '设置' },
    },
    {
      path: '/app/backtest',
      name: 'backtest',
      component: () => import('@/views/BacktestView.vue'),
      meta: { title: '回测编辑器' },
    },
    {
      path: '/app/funds',
      name: 'funds',
      component: () => import('@/views/FundsListView.vue'),
      meta: { title: '基金量化' },
    },
    {
      path: '/app/funds/:code',
      name: 'fund-detail',
      component: () => import('@/views/FundDetailView.vue'),
      meta: { title: '基金详情' },
    },
    {
      path: '/app/data',
      name: 'data',
      component: () => import('@/views/ComingSoonView.vue'),
      meta: { title: '数据中心' },
    },

    // 旧路径重定向（无 /app 前缀）
    { path: '/', redirect: '/app' },
    { path: '/market', redirect: '/app/market' },
    { path: '/strategies', redirect: '/app/strategies' },
    { path: '/strategies/:id', redirect: (to) => `/app/strategies/${to.params.id}` },
    { path: '/holdings', redirect: '/app/holdings' },
    { path: '/trades', redirect: '/app/trades' },
    { path: '/alerts', redirect: '/app/alerts' },
    { path: '/advisor', redirect: '/app/advisor' },
    { path: '/settings', redirect: '/app/settings' },
    { path: '/backtest', redirect: '/app/backtest' },
    // 资讯模块已下线：书签落到总览
    { path: '/news', redirect: '/app' },
    { path: '/app/news', redirect: '/app' },
    { path: '/funds', redirect: '/app/funds' },
    { path: '/funds/:code', redirect: (to) => `/app/funds/${to.params.code}` },
    { path: '/data', redirect: '/app/data' },

    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面未找到' },
    },
  ]
}

const router = createRouter({
  // GitHub Pages 无服务端 rewrite，用 hash 路由；本地开发用 history 路由
  history: import.meta.env.PROD ? createWebHashHistory() : createWebHistory(),
  routes: buildRoutes(),
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
