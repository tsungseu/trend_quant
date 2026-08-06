<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { TqButton, TqNavLink } from '@trendquant/ui'
import { products } from '@/data/catalog'

const route = useRoute()

// Studio 入口：默认本地 5173 /app；生产通过 VITE_TERMINAL_URL 注入
const studioUrl = import.meta.env.VITE_TERMINAL_URL || 'http://localhost:5173/app'
const agentUrl = computed(() => `${studioUrl.replace(/\/$/, '')}/advisor`)

const links = [
  { to: '/pricing', label: '价格' },
  { to: '/docs', label: '知识库' },
  { to: '/about', label: '关于' },
]

const productMenuOpen = ref(false)
const productsActive = computed(() => String(route.path).startsWith('/products'))

const scrolled = ref(false)
const heroDark = computed(() => route.name === 'home')
const navTransparent = computed(() => heroDark.value && !scrolled.value)

function onScroll() {
  scrolled.value = window.scrollY > 24
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const year = new Date().getFullYear()
</script>

<template>
  <div class="marketing" data-theme="light">
    <header class="site-nav" :class="{ transparent: navTransparent, solid: !navTransparent }">
      <div class="mkt-container nav-inner">
        <RouterLink to="/" class="brand" aria-label="TrendQuant 首页">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26">
              <rect width="32" height="32" rx="7" fill="var(--brand)" />
              <path
                d="M7 21l5-6 4 3 6-9 3 4"
                fill="none"
                stroke="#fff"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span class="brand-word">TrendQuant</span>
        </RouterLink>

        <nav class="nav-links">
          <div
            class="nav-dropdown"
            @mouseenter="productMenuOpen = true"
            @mouseleave="productMenuOpen = false"
            @focusin="productMenuOpen = true"
            @focusout="productMenuOpen = false"
          >
            <RouterLink
              to="/products"
              class="dropdown-trigger"
              :class="{ 'is-active': productsActive }"
            >
              产品
              <svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </RouterLink>
            <div class="dropdown-panel" :class="{ open: productMenuOpen }" role="menu">
              <RouterLink
                v-for="p in products"
                :key="p.slug"
                :to="`/products/${p.slug}`"
                class="dropdown-item"
                role="menuitem"
              >
                <span class="dd-name">{{ p.name }}</span>
                <span class="dd-tag">{{ p.tagline }}</span>
              </RouterLink>
            </div>
          </div>
          <TqNavLink v-for="l in links" :key="l.to" :to="l.to">{{ l.label }}</TqNavLink>
        </nav>

        <div class="nav-cta">
          <TqButton :href="agentUrl" variant="ghost" size="md">试用 Agent</TqButton>
          <TqButton :href="studioUrl" variant="primary" size="md">打开 Studio</TqButton>
        </div>
      </div>
    </header>

    <main class="site-main">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="site-footer">
      <div class="mkt-container footer-inner">
        <div class="footer-brand">
          <span class="brand-word">TrendQuant · 趋势量化</span>
          <p class="footer-disclaimer">研究工具，非投资建议。市场有风险，决策需独立判断。</p>
        </div>
        <div class="footer-cols">
          <div class="footer-col">
            <span class="footer-h">产品</span>
            <RouterLink to="/products/agent">MindQuant Agent</RouterLink>
            <RouterLink to="/products/studio">MindQuant Studio</RouterLink>
          </div>
          <div class="footer-col">
            <span class="footer-h">资源</span>
            <RouterLink to="/pricing">价格</RouterLink>
            <RouterLink to="/docs">知识库</RouterLink>
            <RouterLink to="/about">关于我们</RouterLink>
          </div>
          <div class="footer-col">
            <span class="footer-h">开始</span>
            <a :href="agentUrl">试用 Agent</a>
            <a :href="studioUrl">打开 Studio</a>
          </div>
        </div>
      </div>
      <div class="mkt-container footer-legal">
        <span>© {{ year }} TrendQuant. 保留所有权利。</span>
        <span class="footer-legal-note">研究工具，非投资建议</span>
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

.marketing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-paper;
}

.site-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 68px;
  display: flex;
  align-items: center;
  transition:
    background-color 0.25s $ease,
    border-color 0.25s $ease,
    backdrop-filter 0.25s $ease;
}

.site-nav.solid {
  background: rgba(246, 244, 241, 0.86);
  border-bottom: 1px solid $border-paper;
  backdrop-filter: blur(12px);
}

.site-nav.transparent {
  background: transparent;
  border-bottom: 1px solid transparent;
}

.nav-inner {
  display: flex;
  align-items: center;
  gap: $space-6;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.brand-mark {
  display: inline-flex;
}
.brand-word {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: $text-paper-primary;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: $space-8;
  margin-left: $space-6;

  @media (max-width: 820px) {
    display: none;
  }
}

.nav-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary, #475569);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s $ease;

  &:hover,
  &.is-active {
    color: var(--brand, #2563eb);
  }

  .chevron {
    opacity: 0.65;
  }
}

.dropdown-panel {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  min-width: 280px;
  padding: 8px;
  background: #fff;
  border: 1px solid $border-paper;
  border-radius: 12px;
  box-shadow: $shadow-md;
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.15s $ease, transform 0.15s $ease, visibility 0.15s $ease;
  z-index: 60;

  &.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;

  &:hover {
    background: $bg-paper-elevated;
  }
}

.dd-name {
  font-size: 14px;
  font-weight: 600;
  color: $text-paper-primary;
}

.dd-tag {
  font-size: 12.5px;
  color: $text-paper-secondary;
}

.nav-cta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: $space-2;
}

.site-nav.transparent {
  .brand-word {
    color: $hero-text-primary;
  }
  .dropdown-trigger {
    color: rgba(230, 235, 245, 0.82);

    &:hover,
    &.is-active {
      color: #fff;
    }
  }
  :deep(.tq-nav-link) {
    color: rgba(230, 235, 245, 0.82);
  }
  :deep(.tq-nav-link:hover),
  :deep(.tq-nav-link.is-active) {
    color: #fff;
  }
}

.site-main {
  flex: 1;
}

.site-footer {
  background: $hero-bg-start;
  color: $hero-text-secondary;
  padding-top: 72px;
}

.footer-inner {
  display: flex;
  flex-wrap: wrap;
  gap: $space-10;
  justify-content: space-between;
  padding-bottom: 48px;
}

.footer-brand {
  max-width: 320px;
  .brand-word {
    color: $hero-text-primary;
    font-size: 17px;
  }
}
.footer-disclaimer {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.7;
  color: $hero-text-secondary;
}

.footer-cols {
  display: flex;
  gap: $space-10;
  flex-wrap: wrap;
}
.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;

  a {
    font-size: 14px;
    color: $hero-text-secondary;
    transition: color 0.15s $ease;
    &:hover {
      color: $hero-text-primary;
    }
  }
}
.footer-h {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(154, 167, 194, 0.65);
  margin-bottom: 2px;
}

.footer-legal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $space-4;
  padding-top: 24px;
  padding-bottom: 32px;
  margin-top: 8px;
  border-top: 1px solid rgba(154, 167, 194, 0.14);
  font-size: 12px;
  color: rgba(154, 167, 194, 0.7);
}
.footer-legal-note {
  color: rgba(154, 167, 194, 0.55);
}

@media (max-width: 640px) {
  .footer-legal {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
