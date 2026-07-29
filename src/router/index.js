import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'overview',
    component: () => import('@/views/OverviewView.vue'),
    meta: { title: '资产总览' },
  },
  {
    path: '/market',
    name: 'market',
    component: () => import('@/views/MarketView.vue'),
    meta: { title: '行情看盘' },
  },
  {
    path: '/strategies',
    name: 'strategies',
    component: () => import('@/views/StrategyListView.vue'),
    meta: { title: '量化策略' },
  },
  {
    path: '/strategies/:id',
    name: 'strategy-detail',
    component: () => import('@/views/StrategyDetailView.vue'),
    meta: { title: '策略详情' },
  },
  {
    path: '/holdings',
    name: 'holdings',
    component: () => import('@/views/HoldingsView.vue'),
    meta: { title: '我的持仓' },
  },
  {
    path: '/trades',
    name: 'trades',
    component: () => import('@/views/TradesView.vue'),
    meta: { title: '交易记录' },
  },
  {
    path: '/alerts',
    name: 'alerts',
    component: () => import('@/views/AlertsView.vue'),
    meta: { title: '预警中心' },
  },
  {
    path: '/advisor',
    name: 'advisor',
    component: () => import('@/views/AdvisorView.vue'),
    meta: { title: 'AI 投顾' },
  },
  {
    path: '/backtest',
    name: 'backtest',
    component: () => import('@/views/BacktestView.vue'),
    meta: { title: '回测编辑器' },
  },
  {
    path: '/news',
    name: 'news',
    component: () => import('@/views/NewsView.vue'),
    meta: { title: '资讯' },
  },
  {
    path: '/funds',
    name: 'funds',
    component: () => import('@/views/FundsListView.vue'),
    meta: { title: '基金量化' },
  },
  {
    path: '/funds/:code',
    name: 'fund-detail',
    component: () => import('@/views/FundDetailView.vue'),
    meta: { title: '基金详情' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面未找到' },
  },
]

const router = createRouter({
  // GitHub Pages 无服务端 rewrite，用 hash 路由；本地开发用 history 路由
  history: import.meta.env.PROD ? createWebHashHistory() : createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
