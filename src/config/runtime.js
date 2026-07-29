export const runtime = {
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  get isGithubPages() {
    return typeof location !== 'undefined' && location.hostname.endsWith('github.io')
  },
  dataMode: normalizeMode(import.meta.env.VITE_DATA_MODE),
  proxyBase: trimSlash(import.meta.env.VITE_DATA_PROXY_BASE || ''),
  publicBase: import.meta.env.VITE_PUBLIC_BASE || '/trend_quant/',
  allowThirdPartyScripts: parseBool(import.meta.env.VITE_ALLOW_THIRD_PARTY_SCRIPTS, defaultAllowScripts()),
  enableMockLive: parseBool(import.meta.env.VITE_ENABLE_MOCK_LIVE, false),
}

function normalizeMode(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'demo' || raw === 'direct' || raw === 'proxy') return raw
  return import.meta.env.PROD ? 'demo' : 'direct'
}

function defaultAllowScripts() {
  return !import.meta.env.PROD
}

function parseBool(value, fallback) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function trimSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

export const dataModeLabel = () => {
  if (runtime.dataMode === 'proxy') {
    if (!runtime.proxyBase) return '演示快照模式（代理未配置）'
    return '代理真实数据'
  }
  if (runtime.dataMode === 'direct') return '本地直连数据'
  return '演示快照模式'
}

export const canUseProxy = () => runtime.dataMode === 'proxy' && !!runtime.proxyBase
export const canUseDirect = () => runtime.dataMode === 'direct' && runtime.allowThirdPartyScripts
export const isDemoMode = () => runtime.dataMode === 'demo' || (runtime.dataMode === 'proxy' && !runtime.proxyBase)
