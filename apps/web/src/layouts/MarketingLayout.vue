<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { TqButton, TqNavLink } from '@trendquant/ui'
import { products } from '@/data/catalog'
import { terminalUrl as studioUrl } from '@/data/terminal'

const route = useRoute()

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
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
})

// 移动端抽屉：产品分组用手风琴（点击展开），其余链接直接导航。
const mobileOpen = ref(false)
const mobileProductsOpen = ref(false)
const hamburgerRef = ref(null)

function openMobile() {
  mobileOpen.value = true
}

function closeMobile() {
  mobileOpen.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape' && mobileOpen.value) {
    closeMobile()
    nextTick(() => hamburgerRef.value?.focus())
  }
}

// 路由变化时关闭抽屉（点击抽屉内 RouterLink 触发导航后）。
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

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

        <button
          ref="hamburgerRef"
          type="button"
          class="hamburger"
          :class="{ active: mobileOpen }"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-drawer"
          aria-label="打开菜单"
          @click="mobileOpen ? closeMobile() : openMobile()"
        >
          <span class="hamburger-box" aria-hidden="true">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </span>
        </button>
      </div>
    </header>

    <!-- 移动端抽屉：与桌面导航同源数据，产品用手风琴展开 -->
    <Transition name="drawer">
      <div v-if="mobileOpen" class="drawer-overlay" @click.self="closeMobile">
        <aside id="mobile-drawer" class="mobile-drawer" role="dialog" aria-label="站点导航" @click.stop>
          <button type="button" class="drawer-close" aria-label="关闭菜单" @click="closeMobile">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            class="drawer-section-trigger"
            :class="{ open: mobileProductsOpen }"
            :aria-expanded="mobileProductsOpen"
            @click="mobileProductsOpen = !mobileProductsOpen"
          >
            产品
            <svg class="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div class="drawer-sub" v-show="mobileProductsOpen">
            <RouterLink to="/products" class="drawer-link" @click="closeMobile">全部产品</RouterLink>
            <RouterLink
              v-for="p in products"
              :key="p.slug"
              :to="`/products/${p.slug}`"
              class="drawer-link"
              @click="closeMobile"
            >
              <span class="dd-name">{{ p.name }}</span>
              <span class="dd-tag">{{ p.tagline }}</span>
            </RouterLink>
          </div>

          <RouterLink
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="drawer-link single"
            @click="closeMobile"
          >
            {{ l.label }}
          </RouterLink>

          <div class="drawer-cta">
            <TqButton :href="agentUrl" variant="ghost" size="md" @click="closeMobile">试用 Agent</TqButton>
            <TqButton :href="studioUrl" variant="primary" size="md" @click="closeMobile">打开 Studio</TqButton>
          </div>
        </aside>
      </div>
    </Transition>

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

// 汉堡按钮：桌面隐藏，≤820px 显示
.hamburger {
  display: none;
  margin-left: auto;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid $border-paper;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  color: $text-paper-primary;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s $ease, border-color 0.15s $ease;

  &:hover {
    background: #fff;
    border-color: $border-paper;
  }

  &:focus-visible {
    outline: 2px solid var(--brand, #2563eb);
    outline-offset: 2px;
  }

  .hamburger-box {
    display: inline-flex;
    flex-direction: column;
    gap: 4px;
    width: 18px;
  }
  .hamburger-line {
    display: block;
    height: 2px;
    width: 100%;
    background: currentColor;
    border-radius: 2px;
    transition: transform 0.2s $ease, opacity 0.2s $ease;
  }
  &.active {
    .hamburger-line:nth-child(1) {
      transform: translateY(6px) rotate(45deg);
    }
    .hamburger-line:nth-child(2) {
      opacity: 0;
    }
    .hamburger-line:nth-child(3) {
      transform: translateY(-6px) rotate(-45deg);
    }
  }
}

@media (max-width: 820px) {
  .nav-links,
  .nav-cta {
    display: none;
  }
  .hamburger {
    display: inline-flex;
  }
}

// 移动端抽屉
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
}

.mobile-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(86vw, 360px);
  background: $bg-paper;
  border-left: 1px solid $border-paper;
  box-shadow: $shadow-lg;
  padding: 20px 18px 32px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.drawer-close {
  align-self: flex-end;
  width: 36px;
  height: 36px;
  margin-bottom: 8px;
  border: none;
  background: transparent;
  color: $text-paper-secondary;
  cursor: pointer;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: $bg-paper-elevated;
    color: $text-paper-primary;
  }
  &:focus-visible {
    outline: 2px solid var(--brand, #2563eb);
    outline-offset: 2px;
  }
}

.drawer-section-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 6px;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 600;
  color: $text-paper-primary;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid $border-paper;
  .chevron {
    transition: transform 0.2s $ease;
    opacity: 0.7;
  }
  &.open .chevron {
    transform: rotate(180deg);
  }
}

.drawer-sub {
  display: flex;
  flex-direction: column;
  padding-left: 6px;
  border-bottom: 1px solid $border-paper;
}

.drawer-link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 6px;
  text-decoration: none;
  color: $text-paper-primary;
  font-size: 15px;
  border-bottom: 1px solid $border-paper;
  &:last-child {
    border-bottom: none;
  }
  &.single {
    font-weight: 500;
  }
  .dd-tag {
    font-size: 12.5px;
    color: $text-paper-secondary;
    font-weight: 400;
  }
}

.drawer-cta {
  margin-top: auto;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

// 抽屉进出动画
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s $ease;
  .mobile-drawer {
    transition: transform 0.25s $ease;
  }
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  .mobile-drawer {
    transform: translateX(100%);
  }
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
