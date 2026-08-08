import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { safeLoad, safeSave, normalizeLlmProviders, createId, LLM_FORMATS } from '@/utils/storage'

// LLM 供应商配置 store
// - 持久化到 localStorage（版本化信封），密钥只存本地、不在日志打印
// - 支持多供应商 + 一个"当前选中"用于投顾
// - 浏览器直连用户提供的端点：要求端点 CORS 允许或经用户自己的代理
const KEY = 'quant-llm-providers'

function load() {
  return safeLoad(KEY, [], normalizeLlmProviders)
}

export const useLlmStore = defineStore('llm', () => {
  const providers = ref(load())
  const activeId = ref(safeLoad(KEY + ':active', ''))

  // 初始选中：已有 active 则用它，否则取第一个
  function resolveActive() {
    if (activeId.value && providers.value.some((p) => p.id === activeId.value)) return
    activeId.value = providers.value[0]?.id || ''
  }
  resolveActive()

  watch(providers, (v) => safeSave(KEY, normalizeLlmProviders(v)), { deep: true })
  watch(activeId, (v) => safeSave(KEY + ':active', v, 1))

  const activeProvider = computed(() =>
    providers.value.find((p) => p.id === activeId.value) || providers.value[0] || null
  )

  const isConfigured = computed(() => {
    const p = activeProvider.value
    if (!p || !p.name || !p.baseUrl) return false
    // model 缺失时仍视为“已配置但待完善”，由 UI 提示而非静默回退
    return true
  })
  const configComplete = computed(() => {
    const p = activeProvider.value
    return !!(p && p.name && p.baseUrl && p.model)
  })

  function addProvider(partial = {}) {
    const p = {
      id: createId('llm'),
      name: '',
      baseUrl: '',
      apiKey: '',
      format: 'openai',
      models: [],
      model: '',
      ...partial,
    }
    providers.value.push(p)
    activeId.value = p.id
    return p
  }

  function updateProvider(id, patch) {
    const p = providers.value.find((x) => x.id === id)
    if (!p) return
    Object.assign(p, patch)
  }

  function removeProvider(id) {
    providers.value = providers.value.filter((p) => p.id !== id)
    if (activeId.value === id) activeId.value = providers.value[0]?.id || ''
  }

  function setActive(id) {
    if (providers.value.some((p) => p.id === id)) activeId.value = id
  }

  return {
    providers,
    activeId,
    activeProvider,
    isConfigured,
    configComplete,
    formats: LLM_FORMATS,
    addProvider,
    updateProvider,
    removeProvider,
    setActive,
  }
})
