import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { safeLoad, safeSave } from '@/utils/storage'

// 通用偏好设置 store（对应 ZCode 设置里的「常规 / 外观 / 浏览器」）
// - 界面语言：uiLanguage（system / zh-CN / en）
// - 界面字号：fontScale（百分比，90~130）
// - 各项开关：toggles
// - 浏览器控制：browserControl（开启内置浏览器插件）
// 持久化到 localStorage，元素在应用初始化与渲染层读取。
const KEY = 'quant-prefs'

function normalizePrefs(value) {
  const o = value && typeof value === 'object' ? value : {}
  const fontScale = Number(o.fontScale)
  return {
    uiLanguage: ['system', 'zh-CN', 'en'].includes(o.uiLanguage) ? o.uiLanguage : 'system',
    fontScale: Number.isFinite(fontScale) ? Math.min(130, Math.max(90, fontScale)) : 100,
    terminalShell: typeof o.terminalShell === 'string' ? o.terminalShell : 'auto',
    terminalFont: typeof o.terminalFont === 'string' ? o.terminalFont.slice(0, 80) : '',
    httpProxy: typeof o.httpProxy === 'string' ? o.httpProxy.slice(0, 200) : '',
    proxyBypass: typeof o.proxyBypass === 'string' ? o.proxyBypass.slice(0, 400) : '',
    customCa: typeof o.customCa === 'string' ? o.customCa.slice(0, 300) : '',
    chromeAcceleration: o.chromeAcceleration !== false, // 默认开
    previewBuilds: !!o.previewBuilds,
    autoUpdate: o.autoUpdate !== false, // 默认开
    taskNotify: o.taskNotify !== false, // 默认开
    notifySound: o.notifySound !== false, // 默认开
    closeToTray: !!o.closeToTray,
    showThinking: o.showThinking !== false, // 默认开
    showTodo: o.showTodo !== false, // 默认开
    autoArchive: o.autoArchive !== false, // 默认开
    archiveDays: Number.isFinite(Number(o.archiveDays)) ? Math.min(90, Math.max(1, Number(o.archiveDays))) : 7,
    dataPath: typeof o.dataPath === 'string' ? o.dataPath.slice(0, 400) : '',
    optimizeExperience: o.optimizeExperience !== false, // 默认开
    browserControl: !!o.browserControl,
    // 代码/内容显示（外观子项）
    codeThemeLight: typeof o.codeThemeLight === 'string' ? o.codeThemeLight : 'GitHub Light',
    codeThemeDark: typeof o.codeThemeDark === 'string' ? o.codeThemeDark : 'GitHub Dark',
    showLineNumbers: o.showLineNumbers !== false,
    softWrap: !!o.softWrap,
    codeFontSize: Number.isFinite(Number(o.codeFontSize)) ? Math.min(20, Math.max(10, Number(o.codeFontSize))) : 12,
  }
}

export const usePrefsStore = defineStore('prefs', () => {
  const prefs = ref(safeLoad(KEY, {}, normalizePrefs))

  watch(
    prefs,
    (v) => safeSave(KEY, normalizePrefs(v)),
    { deep: true }
  )

  function update(patch) {
    Object.assign(prefs.value, patch)
  }
  function reset() {
    prefs.value = normalizePrefs({})
  }

  const uiLanguageLabel = computed(() => {
    return { system: '跟随系统', 'zh-CN': '简体中文', en: 'English' }[prefs.value.uiLanguage]
  })

  return { prefs, update, reset, uiLanguageLabel }
})
