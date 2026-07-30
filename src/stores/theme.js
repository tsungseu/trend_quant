import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { safeGetItem, safeSetItem } from '@/utils/storage'

// 主题 store：dark / light / system，持久化到 localStorage，应用到 <html data-theme>
export const useThemeStore = defineStore('theme', () => {
  const STORAGE_KEY = 'quant-theme'

  const getInitial = () => {
    const saved = safeGetItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    // 默认跟随系统偏好
    return 'system'
  }

  const mode = ref(getInitial()) // 'dark' | 'light' | 'system'

  // 实际生效的主题：system 模式跟随 prefers-color-scheme
  function resolveTheme(m) {
    if (m === 'system') {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'dark' : 'light'
    }
    return m
  }

  const theme = ref(resolveTheme(mode.value))

  // 监听系统主题变化（仅 system 模式生效）
  let media = null
  function bindSystem() {
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (media) media.removeEventListener('change', onSystemChange)
    if (mode.value === 'system') {
      media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', onSystemChange)
    }
  }
  function onSystemChange() {
    if (mode.value === 'system') theme.value = resolveTheme('system')
  }

  function apply(t) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t)
    }
  }

  function setMode(m) {
    mode.value = m
  }

  function toggle() {
    // 手动切换：在 dark / light 间切换（脱离 system）
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    mode.value = theme.value
  }

  // 初始应用 + 持久化监听
  apply(theme.value)
  bindSystem()
  watch(mode, (m) => {
    theme.value = resolveTheme(m)
    apply(theme.value)
    safeSetItem(STORAGE_KEY, m)
    bindSystem()
  })

  const isDark = computed(() => theme.value === 'dark')
  const isLight = computed(() => theme.value === 'light')

  return { mode, theme, setMode, toggle, isDark, isLight }
})
