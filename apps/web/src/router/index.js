import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import MarketingLayout from '@/layouts/MarketingLayout.vue'
import HomeView from '@/views/HomeView.vue'
import { legacyProductRedirects } from '@/data/catalog'

export function buildRoutes() {
  const legacyRedirects = Object.entries(legacyProductRedirects).map(([from, to]) => ({
    path: `products/${from}`,
    redirect: `/products/${to}`,
  }))

  return [
    {
      path: '/',
      component: MarketingLayout,
      children: [
        { path: '', name: 'home', component: HomeView },
        {
          path: 'products',
          name: 'products',
          component: () => import('@/views/ProductsView.vue'),
        },
        ...legacyRedirects,
        {
          path: 'products/:slug',
          name: 'product-detail',
          component: () => import('@/views/ProductDetailView.vue'),
        },
        {
          path: 'pricing',
          name: 'pricing',
          component: () => import('@/views/PricingView.vue'),
        },
        {
          path: 'docs/:section?',
          name: 'docs',
          component: () => import('@/views/DocsView.vue'),
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('@/views/AboutView.vue'),
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
        },
      ],
    },
  ]
}

const router = createRouter({
  // GitHub Pages 无服务端 rewrite，生产用 hash 路由；本地开发用 history 路由
  history: import.meta.env.PROD ? createWebHashHistory() : createWebHistory(),
  routes: buildRoutes(),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
