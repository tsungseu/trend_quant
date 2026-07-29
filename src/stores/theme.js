import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { safeGetItem, safeSetItem } from '@/utils/storage'

// 主题 store：dark / light，持久化到 localStorage，应用到 <html data-theme>
export const useThemeStore = defineStore('theme', () => {
  const STORAGE_KEY = 'quant-theme'

  const getInitial = () => {
    const saved = safeGetItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    // 默认深色（交易类应用）
    return 'dark'
  }

  const theme = ref(getInitial())

  function apply(t) {
    document.documentElement.setAttribute('data-theme', t)
  }

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  // 初始应用 + 持久化监听
  apply(theme.value)
  watch(theme, (t) => {
    apply(t)
    safeSetItem(STORAGE_KEY, t)
  })

  const isDark = () => theme.value === 'dark'
  const isLight = () => theme.value === 'light'

  return { theme, toggle, isDark, isLight }
})
