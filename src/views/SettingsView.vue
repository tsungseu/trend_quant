<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useLlmStore } from '@/stores/llm'
import { usePrefsStore } from '@/stores/prefs'
import { useThemeStore } from '@/stores/theme'
import { LLM_FORMATS } from '@/utils/storage'

// ============ 左侧分组导航 ============
const groups = [
  { key: 'general', label: '常规', icon: 'general' },
  { key: 'appearance', label: '外观', icon: 'appearance' },
  { key: 'model', label: '模型设置', icon: 'model' },
  { key: 'browser', label: '浏览器', icon: 'browser' },
]
const active = ref('general')

const navIcons = {
  general:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  appearance:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>',
  model:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 013 3v1a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M5 21v-2a7 7 0 0114 0v2"/></svg>',
  browser:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 7h20M8 21l-2-4M16 21l2-4"/></svg>',
}

const store = useLlmStore()
const prefsStore = usePrefsStore()
const prefs = prefsStore.prefs
const theme = useThemeStore()

// ============ 常规 ============
const general = reactive({
  uiLanguage: prefs.uiLanguage,
  terminalShell: prefs.terminalShell,
  terminalFont: prefs.terminalFont,
  httpProxy: prefs.httpProxy,
  proxyBypass: prefs.proxyBypass,
  customCa: prefs.customCa,
  chromeAcceleration: prefs.chromeAcceleration,
  previewBuilds: prefs.previewBuilds,
  autoUpdate: prefs.autoUpdate,
  taskNotify: prefs.taskNotify,
  notifySound: prefs.notifySound,
  closeToTray: prefs.closeToTray,
  showThinking: prefs.showThinking,
  showTodo: prefs.showTodo,
  autoArchive: prefs.autoArchive,
  archiveDays: prefs.archiveDays,
  dataPath: prefs.dataPath,
  optimizeExperience: prefs.optimizeExperience,
})

// 同步常规表单到 store
function commitGeneral() {
  prefsStore.update({ ...general })
}
function watchGeneral() {}

const languages = [
  { value: 'system', label: '系统默认' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]
const shells = [
  { value: 'auto', label: '自动选择' },
  { value: 'bash', label: 'Git Bash' },
  { value: 'cmd', label: 'cmd.exe' },
  { value: 'powershell', label: 'PowerShell' },
]

// ============ 外观 ============
const appearance = reactive({
  mode: theme.mode,
  fontScale: prefs.fontScale,
  codeThemeLight: prefs.codeThemeLight,
  codeThemeDark: prefs.codeThemeDark,
  showLineNumbers: prefs.showLineNumbers,
  softWrap: prefs.softWrap,
  codeFontSize: prefs.codeFontSize,
})

function setThemeMode(m) {
  theme.setMode(m)
  appearance.mode = m
}
function commitAppearance() {
  prefsStore.update({
    fontScale: appearance.fontScale,
    codeThemeLight: appearance.codeThemeLight,
    codeThemeDark: appearance.codeThemeDark,
    showLineNumbers: appearance.showLineNumbers,
    softWrap: appearance.softWrap,
    codeFontSize: appearance.codeFontSize,
  })
}

// ============ 模型设置（LLM 供应商）============
const formats = [
  { value: 'anthropic', label: 'Anthropic Messages (/v1/messages)' },
  { value: 'openai', label: 'OpenAI Chat Completions (/v1/chat/completions)' },
  { value: 'responses', label: 'OpenAI Responses (/v1/responses)' },
]
const editingId = ref('closed') // 'closed' | 'new' | providerId
const form = reactive({
  name: '',
  baseUrl: '',
  apiKey: '',
  format: 'openai',
  modelList: [],   // [{ name, modelId, contextWindow }] 模型对象数组
  model: '',       // 默认模型 modelId
  newModel: '',    // 添加模型输入框
  editingModel: -1, // 正在编辑详情的模型索引（-1=无）
})
function resetForm() {
  editingId.value = 'closed'
  form.name = ''
  form.baseUrl = ''
  form.apiKey = ''
  form.format = 'openai'
  form.modelList = []
  form.model = ''
  form.newModel = ''
  form.editingModel = -1
}
// 打开"新增供应商"表单（与编辑区分，避免与 resetForm 互相抵消导致表单打不开）
function openAdd() {
  editingId.value = 'new'
  form.name = ''
  form.baseUrl = ''
  form.apiKey = ''
  form.format = 'openai'
  form.modelList = []
  form.model = ''
  form.newModel = ''
  form.editingModel = -1
}
function startEdit(p) {
  editingId.value = p.id
  form.name = p.name
  form.baseUrl = p.baseUrl
  form.apiKey = p.apiKey || ''
  form.format = p.format
  form.modelList = (p.models || []).map((m) => ({
    name: m.name || m.modelId,
    modelId: m.modelId,
    contextWindow: m.contextWindow || 0,
  }))
  form.model = p.model || form.modelList[0]?.modelId || ''
  form.newModel = ''
  form.editingModel = -1
}
// 添加模型：支持逗号批量输入，去重（按 modelId）
function addModel() {
  const names = form.newModel.split(/[\s,，、]+/).map((s) => s.trim()).filter(Boolean)
  for (const n of names) {
    if (!form.modelList.some((m) => m.modelId === n)) {
      form.modelList.push({ name: n, modelId: n, contextWindow: 0 })
    }
  }
  form.newModel = ''
}
// 删除模型：同步清理默认模型（若被删的是默认模型，回退首个）
function removeModel(idx) {
  const removed = form.modelList[idx]
  form.modelList.splice(idx, 1)
  if (removed && form.model === removed.modelId) form.model = form.modelList[0]?.modelId || ''
  if (form.editingModel === idx) form.editingModel = -1
  else if (form.editingModel > idx) form.editingModel--
}
function setDefaultModel(modelId) {
  form.model = modelId
}
// 切换模型详情编辑面板
function toggleEditModel(idx) {
  form.editingModel = form.editingModel === idx ? -1 : idx
}
async function saveProvider() {
  const payload = {
    name: form.name.trim(),
    baseUrl: form.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: form.apiKey.trim(),
    format: LLM_FORMATS.includes(form.format) ? form.format : 'openai',
    models: form.modelList.map((m) => ({
      name: (m.name || m.modelId).trim(),
      modelId: (m.modelId || m.name).trim(),
      contextWindow: Number(m.contextWindow) || 0,
    })),
    model: form.model || form.modelList[0]?.modelId || '',
  }
  if (!payload.name || !payload.baseUrl) return
  // 保存前校验 Base URL，阻止保存内网/回环等不安全地址
  if (!(await validateBaseUrl(payload.baseUrl))) {
    formError.value = 'Base URL 不被允许：仅支持 http/https 公开地址，不能为 localhost 或内网地址'
    return
  }
  formError.value = ''
  if (editingId.value !== 'closed' && editingId.value !== 'new') {
    store.updateProvider(editingId.value, payload)
  } else {
    store.addProvider(payload)
  }
  resetForm()
}
function removeProvider(id) {
  const p = store.providers.find((x) => x.id === id)
  const name = p?.name || '该供应商'
  if (!window.confirm(`确定删除「${name}」？将一并清除本地保存的 API Key，且不可恢复。`)) return
  store.removeProvider(id)
  if (editingId.value === id) resetForm()
}
function maskKey(k) {
  if (!k) return '—'
  return k.length <= 8 ? '••••' : k.slice(0, 4) + '••••' + k.slice(-4)
}
const activeId = computed(() => store.activeId)
function selectActive(id) {
  store.setActive(id)
}

// 测试连通性
const testing = ref(false)
const testMsg = ref('')
async function testConnection(p) {
  testing.value = true
  testMsg.value = ''
  try {
    const mod = await import('@/api/llm')
    let acc = ''
    await mod.streamChat(
      { ...p, model: p.model || p.models[0]?.modelId },
      [{ role: 'user', content: '请用一句话回复：连接测试成功。' }],
      (t) => { acc += t },
      {}
    )
    testMsg.value = '连接成功，已收到回复（' + acc.length + ' 字）'
  } catch (e) {
    // 仅展示安全的失败原因（如 URL 不被允许），不暴露上游响应体
    testMsg.value = '连接失败：' + (e?.message || '未知错误')
  } finally {
    testing.value = false
  }
}

// 保存前对 Base URL 做 SSRF 校验，给用户即时反馈而非等到调用才报错
const formError = ref('')
async function validateBaseUrl(url) {
  try {
    const mod = await import('@/api/llm')
    return mod._isAllowedBaseUrl(url)
  } catch {
    return true // 校验工具不可用时放行（最终由 streamChat 兜底拦截）
  }
}

// ============ 浏览器 ============
const browser = reactive({
  browserControl: prefs.browserControl,
})

function commitBrowser() {
  prefsStore.update({ browserControl: browser.browserControl })
}
function clearBrowserCache() {
  // 占位：演示环境无内置浏览器，仅提示
  browserMsg.value = '已清除内置浏览器 HTTP 缓存（演示环境为占位操作）'
}
function clearAllBrowserData() {
  browserMsg.value = '已删除内置浏览器全部数据（演示环境为占位操作，不可撤销）'
}
const browserMsg = ref('')

onUnmounted(() => {})
</script>

<template>
  <div class="settings-layout">
    <!-- 左侧分组导航 -->
    <aside class="settings-nav">
      <div class="nav-title">设置</div>
      <button
        v-for="g in groups"
        :key="g.key"
        class="nav-item"
        :class="{ active: active === g.key }"
        @click="active = g.key"
      >
        <span class="nav-ico" v-html="navIcons[g.icon]"></span>
        <span class="nav-label">{{ g.label }}</span>
      </button>
    </aside>

    <!-- 右侧内容 -->
    <div class="settings-content">
      <!-- 常规 -->
      <section v-if="active === 'general'" class="settings-section">
        <h3 class="section-title">常规</h3>

        <!-- 通用 -->
        <div class="card">
          <div class="card-title">通用</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">界面语言</div>
              <div class="sr-desc">选择应用界面的显示语言。</div>
            </div>
            <select v-model="general.uiLanguage" class="sr-control" @change="commitGeneral">
              <option v-for="l in languages" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">显示思考过程</div>
              <div class="sr-desc">在消息流中展示完整的模型思考内容；关闭时每轮仍展示第一次思考。</div>
            </div>
            <button class="switch" :class="{ on: general.showThinking }" @click="general.showThinking = !general.showThinking; commitGeneral()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">显示待办</div>
              <div class="sr-desc">在消息流中展示待办卡片。</div>
            </div>
            <button class="switch" :class="{ on: general.showTodo }" @click="general.showTodo = !general.showTodo; commitGeneral()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">优化体验</div>
              <div class="sr-desc">允许我们将你的对话内容用于优化使用体验。我们保障你的数据隐私安全。</div>
            </div>
            <button class="switch" :class="{ on: general.optimizeExperience }" @click="general.optimizeExperience = !general.optimizeExperience; commitGeneral()"><span class="knob"></span></button>
          </div>
        </div>

        <!-- 命令行环境 -->
        <div class="card">
          <div class="card-title">命令行环境</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">继承系统命令行环境</div>
              <div class="sr-desc">命令行运行时，尽量继承本机登录环境、代理与字体设置。</div>
            </div>
            <span class="sr-control muted">系统默认</span>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">命令行字体</div>
              <div class="sr-desc">留空时自动探测系统配置；填写后作为本应用命令行的字体覆盖。</div>
            </div>
            <input v-model="general.terminalFont" class="sr-control" placeholder="留空自动继承，例如 MesloLGS NF, monospace" @change="commitGeneral" />
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">命令行 Shell</div>
              <div class="sr-desc">仅新会话生效。Windows 下优先 Git Bash，找不到回退 cmd.exe。</div>
            </div>
            <select v-model="general.terminalShell" class="sr-control" @change="commitGeneral">
              <option v-for="s in shells" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">队列</div>
              <div class="sr-desc">任务运行时，将后续操作加入队列，或在下一轮工具调用后再执行。</div>
            </div>
            <span class="sr-control muted">在运行时排队</span>
          </div>
        </div>

        <!-- 网络 -->
        <div class="card">
          <div class="card-title">网络</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">HTTP 代理</div>
              <div class="sr-desc">模型调用、命令工具与应用界面的网络请求将经此代理；留空时直连。修改后需重启应用生效。</div>
            </div>
            <input v-model="general.httpProxy" class="sr-control" placeholder="留空直连，例如 http://127.0.0.1:7890" @change="commitGeneral" />
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">代理例外</div>
              <div class="sr-desc">匹配这些主机的请求将直连。多个规则用英文逗号分隔。修改后需重启应用生效。</div>
            </div>
            <input v-model="general.proxyBypass" class="sr-control" placeholder="localhost,127.0.0.1,::1,.example.com" @change="commitGeneral" />
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">自定义证书</div>
              <div class="sr-desc">可选。填写 PEM 根证书路径，用于校验自签名或企业内网证书。修改后需重启应用生效。</div>
            </div>
            <input v-model="general.customCa" class="sr-control" placeholder="例如 /Users/name/certs/root-ca.pem" @change="commitGeneral" />
          </div>
        </div>

        <!-- 更新与硬件 -->
        <div class="card">
          <div class="card-title">更新与硬件</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">硬件加速</div>
              <div class="sr-desc">关闭后可规避部分显卡或驱动导致的白屏、闪退、渲染异常。修改后需重启应用生效。</div>
            </div>
            <button class="switch" :class="{ on: general.chromeAcceleration }" @click="general.chromeAcceleration = !general.chromeAcceleration; commitGeneral()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">接受提前收到预览版更新</div>
              <div class="sr-desc">开启后将最快、提前体验新功能和改进版本。</div>
            </div>
            <button class="switch" :class="{ on: general.previewBuilds }" @click="general.previewBuilds = !general.previewBuilds; commitGeneral()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">自动下载并安装更新</div>
              <div class="sr-desc">开启后检测到更新会自动开始下载。</div>
            </div>
            <button class="switch" :class="{ on: general.autoUpdate }" @click="general.autoUpdate = !general.autoUpdate; commitGeneral()"><span class="knob"></span></button>
          </div>
        </div>

        <!-- 通知 -->
        <div class="card">
          <div class="card-title">通知</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">任务通知</div>
              <div class="sr-desc">任务完成、失败或需要确认时发送桌面通知。</div>
            </div>
            <button class="switch" :class="{ on: general.taskNotify }" @click="general.taskNotify = !general.taskNotify; commitGeneral()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">通知声音</div>
              <div class="sr-desc">通知开启后，可单独关闭任务通知提示音。</div>
            </div>
            <button class="switch" :class="{ on: general.notifySound }" @click="general.notifySound = !general.notifySound; commitGeneral()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">关闭窗口时隐藏到托盘</div>
              <div class="sr-desc">仅 Windows 生效。点击关闭按钮时隐藏窗口，托盘退出仍会完全退出。</div>
            </div>
            <button class="switch" :class="{ on: general.closeToTray }" @click="general.closeToTray = !general.closeToTray; commitGeneral()"><span class="knob"></span></button>
          </div>
        </div>

        <!-- 数据与归档 -->
        <div class="card">
          <div class="card-title">数据与归档</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">自动归档旧任务</div>
              <div class="sr-desc">定时扫描最近打开过的工作区，将已完成、无未读、未置顶且超过保留期的任务自动归档。</div>
            </div>
            <button class="switch" :class="{ on: general.autoArchive }" @click="general.autoArchive = !general.autoArchive; commitGeneral()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">归档保留时长</div>
              <div class="sr-desc">任务最后更新时间早于该时长后，才会进入自动归档候选。</div>
            </div>
            <div class="sr-control inline">
              <input type="number" min="1" max="90" v-model.number="general.archiveDays" @change="commitGeneral" />
              <span class="unit">天后归档</span>
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">数据存储路径</div>
              <div class="sr-desc">应用数据的根目录，修改后会将现有数据复制到新位置。</div>
            </div>
            <input v-model="general.dataPath" class="sr-control" placeholder="C:\Users\xucong" @change="commitGeneral" />
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">引导</div>
              <div class="sr-desc">重新打开引导弹窗，查看迁移选项并导入设置。</div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="browserMsg = ''">重新打开引导弹窗</button>
          </div>
        </div>
      </section>

      <!-- 外观 -->
      <section v-if="active === 'appearance'" class="settings-section">
        <h3 class="section-title">外观</h3>

        <!-- 主题与字号 -->
        <div class="card">
          <div class="card-title">主题与字号</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">界面主题</div>
              <div class="sr-desc">选择浅色、深色或跟随系统主题。</div>
            </div>
            <div class="seg-control">
              <button :class="{ active: appearance.mode === 'light' }" @click="setThemeMode('light')">浅色</button>
              <button :class="{ active: appearance.mode === 'dark' }" @click="setThemeMode('dark')">深色</button>
              <button :class="{ active: appearance.mode === 'system' }" @click="setThemeMode('system')">跟随系统</button>
            </div>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">界面字号</div>
              <div class="sr-desc">调整应用界面的文字大小，图标和布局尺寸不受影响。</div>
            </div>
            <div class="sr-control inline">
              <input type="number" min="90" max="130" v-model.number="appearance.fontScale" @change="commitAppearance" />
              <span class="unit">px</span>
            </div>
          </div>
        </div>

        <!-- 内容显示 -->
        <div class="card">
          <div class="card-title">内容显示</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">浅色主题</div>
              <div class="sr-desc">浅色界面下文本与内容的高亮主题。</div>
            </div>
            <select v-model="appearance.codeThemeLight" class="sr-control" @change="commitAppearance">
              <option>GitHub Light</option>
              <option>GitHub Light Default</option>
              <option>Atom One Light</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">深色主题</div>
              <div class="sr-desc">深色界面下内容使用的高亮主题。</div>
            </div>
            <select v-model="appearance.codeThemeDark" class="sr-control" @change="commitAppearance">
              <option>GitHub Dark</option>
              <option>GitHub Dark Default</option>
              <option>Atom One Dark</option>
            </select>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">显示行号</div>
              <div class="sr-desc">在内容和差异视图中显示行号。</div>
            </div>
            <button class="switch" :class="{ on: appearance.showLineNumbers }" @click="appearance.showLineNumbers = !appearance.showLineNumbers; commitAppearance()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">长行自动换行</div>
              <div class="sr-desc">内容过长时自动换行。</div>
            </div>
            <button class="switch" :class="{ on: appearance.softWrap }" @click="appearance.softWrap = !appearance.softWrap; commitAppearance()"><span class="knob"></span></button>
          </div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">字号</div>
              <div class="sr-desc">调整内容块、文件预览和差异视图的默认字号。</div>
            </div>
            <div class="sr-control inline">
              <input type="number" min="10" max="20" v-model.number="appearance.codeFontSize" @change="commitAppearance" />
            </div>
          </div>
        </div>
      </section>

      <!-- 模型设置 -->
      <section v-if="active === 'model'" class="settings-section">
        <h3 class="section-title">模型设置</h3>
        <p class="muted tip">
          管理自定义模型供应商，配置后 AI 投顾会自动切换为真实模型回复；未配置时仍使用内置模拟回复。密钥仅保存在本地浏览器，不会上传到服务器。
        </p>

        <!-- 表单 -->
        <div v-if="editingId !== 'closed'" class="provider-form">
          <div class="fld">
            <label>名称</label>
            <input v-model="form.name" placeholder="如：智谱 GLM" />
          </div>
          <div class="fld">
            <label>Base URL</label>
            <input v-model="form.baseUrl" placeholder="https://api.example.com/v1" />
            <span v-if="formError" class="form-err">{{ formError }}</span>
          </div>
          <div class="fld">
            <label>API Key</label>
            <input v-model="form.apiKey" type="password" placeholder="输入 API Key" autocomplete="off" />
          </div>
          <div class="fld">
            <label>API 格式</label>
            <select v-model="form.format">
              <option v-for="f in formats" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>
          <div class="fld fld-full">
            <label>模型列表</label>
            <div class="model-manager">
              <div v-if="form.modelList.length" class="model-list">
                <div
                  v-for="(m, idx) in form.modelList"
                  :key="m.modelId + idx"
                  class="model-row"
                  :class="{ active: form.model === m.modelId }"
                >
                  <div class="model-row-head">
                    <button type="button" class="mc-set" :title="form.model === m.modelId ? '默认模型' : '点击设为默认'" @click="setDefaultModel(m.modelId)">
                      <span class="mc-radio" :class="{ on: form.model === m.modelId }"></span>
                    </button>
                    <span class="mc-name" @click="toggleEditModel(idx)">{{ m.name || m.modelId }}</span>
                    <span v-if="form.model === m.modelId" class="mc-default">默认</span>
                    <span v-if="m.contextWindow" class="mc-ctx muted">{{ (m.contextWindow / 1000) >= 1000 ? (m.contextWindow / 1000000) + 'M' : (m.contextWindow / 1000) + 'K' }}</span>
                    <span class="mc-id muted">{{ m.modelId }}</span>
                    <div class="mc-ops">
                      <button type="button" class="mc-edit" :class="{ on: form.editingModel === idx }" title="编辑详情" @click="toggleEditModel(idx)">⚙</button>
                      <button type="button" class="mc-del" title="删除" @click="removeModel(idx)">×</button>
                    </div>
                  </div>
                  <div v-if="form.editingModel === idx" class="model-row-edit">
                    <label class="mre-fld">
                      <span>显示名</span>
                      <input v-model="m.name" placeholder="如：智谱 GLM" />
                    </label>
                    <label class="mre-fld">
                      <span>模型 ID <em class="muted">*</em></span>
                      <input v-model="m.modelId" placeholder="如：glm-4-plus（API 实际调用名）" />
                    </label>
                    <label class="mre-fld mre-ctx">
                      <span>上下文窗口</span>
                      <input v-model.number="m.contextWindow" type="number" min="0" placeholder="如：128000" />
                    </label>
                  </div>
                </div>
              </div>
              <div v-else class="model-empty muted">暂无模型，在下方添加</div>
              <div class="model-add">
                <input
                  v-model="form.newModel"
                  placeholder="输入模型 ID，回车添加（支持逗号批量）"
                  @keydown.enter.prevent="addModel"
                />
                <button type="button" class="btn btn-ghost btn-sm" :disabled="!form.newModel.trim()" @click="addModel">添加</button>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary btn-sm" :disabled="!form.name || !form.baseUrl" @click="saveProvider">
              {{ editingId === 'new' ? '添加' : '保存修改' }}
            </button>
            <button class="btn btn-ghost btn-sm" @click="resetForm()">取消</button>
          </div>
        </div>

        <!-- 列表 -->
        <ul v-if="store.providers.length" class="provider-list">
          <li v-for="p in store.providers" :key="p.id" class="provider-item" :class="{ active: p.id === activeId }">
            <div class="pi-main">
              <div class="pi-name">
                {{ p.name }}
                <span v-if="p.id === activeId" class="pi-tag">当前使用</span>
              </div>
              <div class="pi-meta muted">{{ p.baseUrl }} · {{ p.format }} · 模型：{{ p.model || p.models[0]?.modelId || '—' }}{{ p.models.length > 1 ? ' 等 ' + p.models.length + ' 个' : '' }}</div>
              <div class="pi-key muted">API Key：{{ maskKey(p.apiKey) }}</div>
            </div>
            <div class="pi-actions">
              <button class="btn btn-ghost btn-sm" :disabled="testing" @click="selectActive(p.id)">选用</button>
              <button class="btn btn-ghost btn-sm" @click="testConnection(p)">测试</button>
              <button class="btn btn-ghost btn-sm" @click="startEdit(p)">编辑</button>
              <button class="btn btn-ghost btn-sm danger" @click="removeProvider(p.id)">删除</button>
            </div>
          </li>
        </ul>
        <div v-if="editingId !== 'new' && (!store.providers.length || editingId === 'closed')" class="add-row">
          <button class="btn btn-ghost btn-sm" @click="openAdd()">+ 添加供应商</button>
        </div>
        <div v-if="testMsg" class="test-msg" :class="{ err: testMsg.startsWith('连接失败') }">{{ testMsg }}</div>
      </section>

      <!-- 浏览器 -->
      <section v-if="active === 'browser'" class="settings-section">
        <h3 class="section-title">浏览器</h3>

        <div class="card">
          <div class="card-title">内置浏览器</div>
          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">浏览器控制</div>
              <div class="sr-desc">开启内置浏览器控制，让新会话可以通过内置浏览器访问和操作网页。</div>
            </div>
            <button class="switch" :class="{ on: browser.browserControl }" @click="browser.browserControl = !browser.browserControl; commitBrowser()"><span class="knob"></span></button>
          </div>

          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">清除内置浏览器缓存</div>
              <div class="sr-desc">清除 HTTP 缓存、Cache Storage 和 Service Worker，保留 Cookie 和本地站点数据。</div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="clearBrowserCache()">清除缓存</button>
          </div>

          <div class="setting-row">
            <div class="sr-text">
              <div class="sr-label">清除全部浏览器数据</div>
              <div class="sr-desc">删除内置浏览器中的 Cookie、站点数据和缓存。此操作不可撤销。</div>
            </div>
            <button class="btn btn-ghost btn-sm danger" @click="clearAllBrowserData()">清除全部数据</button>
          </div>
        </div>

        <div v-if="browserMsg" class="test-msg">{{ browserMsg }}</div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.settings-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: $space-6;
  max-width: 1000px;
  align-items: start;
}

.settings-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: $space-4;
  background: $bg-panel;
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  .nav-title {
    font-size: 13px;
    font-weight: 700;
    color: $text-secondary;
    padding: $space-2 $space-2 $space-4;
    letter-spacing: 0.04em;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3;
    border-radius: $radius-md;
    color: $text-secondary;
    font-size: 13px;
    text-align: left;
    width: 100%;
    &:hover { background: $bg-panel-2; color: $text-primary; }
    &.active {
      background: $brand-soft;
      color: $brand;
      font-weight: 600;
    }
    .nav-ico { width: 18px; height: 18px; display: inline-flex; }
    .nav-label { white-space: nowrap; }
  }
}

.settings-content { min-width: 0; }

.settings-section {
  padding: $space-2 0;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 $space-4 $space-1;
}
// 分组卡片：承担视觉分组，section 仅作容器
.card {
  background: $bg-panel;
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  padding: $space-2 $space-5;
  margin-bottom: $space-4;
  &:last-child { margin-bottom: 0; }
  .card-title {
    font-size: 13px;
    font-weight: 700;
    color: $text-secondary;
    padding: $space-4 0 $space-2;
    letter-spacing: 0.02em;
  }
  // 卡片内最后一条 row 去掉分隔线
  .setting-row:last-child { border-bottom: none; }
}
.tip {
  font-size: 12px;
  margin: 0 0 $space-4;
  line-height: 1.6;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-6;
  padding: $space-4 0;
  border-bottom: 1px solid $border-subtle;
  &:last-child { border-bottom: none; }
  .sr-text { min-width: 0; flex: 1; }
  .sr-label { font-size: 13px; font-weight: 600; color: $text-primary; }
  .sr-desc { font-size: 12px; color: $text-secondary; margin-top: 3px; line-height: 1.5; max-width: 560px; }
  .sr-control {
    flex-shrink: 0;
    min-width: 240px;
    height: 36px;
    padding: 0 $space-3;
    background: $bg-panel-2;
    border: 1px solid $border-subtle;
    border-radius: $radius-md;
    color: $text-primary;
    font-size: 13px;
    outline: none;
    &:focus { border-color: $brand; }
    &.muted { color: $text-tertiary; border-style: dashed; }
    &.inline { display: inline-flex; align-items: center; gap: $space-2; width: auto; min-width: 0; padding: 0; background: transparent; border: none; }
    .unit { font-size: 12px; color: $text-secondary; white-space: nowrap; }
    input[type='number'] {
      width: 72px; height: 36px; padding: 0 $space-2;
      background: $bg-panel-2; border: 1px solid $border-subtle;
      border-radius: $radius-md; color: $text-primary; font-size: 13px; outline: none;
      &:focus { border-color: $brand; }
    }
  }
}

// 分段控件（主题）
.seg-control {
  display: inline-flex;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  padding: 2px;
  flex-shrink: 0;
  button {
    padding: 6px 14px;
    font-size: 12px;
    border-radius: $radius-sm;
    color: $text-secondary;
    &.active { background: $brand; color: #fff; font-weight: 600; }
  }
}

// 开关
.switch {
  position: relative;
  width: 42px; height: 24px;
  border-radius: 12px;
  background: $border-strong;
  transition: background 0.2s;
  flex-shrink: 0;
  .knob {
    position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  &.on { background: $brand; }
  &.on .knob { left: 21px; }
}

// 供应商表单
.provider-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
  padding: $space-4;
  background: $bg-panel-2;
  border-radius: $radius-md;
  margin-bottom: $space-4;
}
.fld {
  display: flex; flex-direction: column; gap: 6px;
  label { font-size: 12px; color: $text-secondary; }
  input, select {
    height: 36px; padding: 0 $space-3;
    background: $bg-panel; border: 1px solid $border-subtle;
    border-radius: $radius-md; color: $text-primary; font-size: 13px; outline: none;
    &:focus { border-color: $brand; }
  }
}
.form-actions { grid-column: 1 / -1; display: flex; gap: $space-2; }
.fld-full { grid-column: 1 / -1; }

// 可视化模型列表管理
.model-manager {
  display: flex; flex-direction: column; gap: $space-2;
}
.model-list {
  display: flex; flex-direction: column; gap: 4px;
}
.model-row {
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  background: $bg-panel;
  overflow: hidden;
  &.active { border-color: $brand; background: $brand-soft; }
}
.model-row-head {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px;
}
.mc-set {
  display: flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border: none; background: none; cursor: pointer; padding: 0;
}
.mc-radio {
  width: 14px; height: 14px; border-radius: 50%;
  border: 1.5px solid $border-default;
  &.on { border-color: $brand; background: $brand; box-shadow: inset 0 0 0 3px $bg-panel; }
}
.mc-name {
  font-size: 13px; font-weight: 500; color: $text-primary; cursor: pointer;
  &:hover { color: $brand; }
}
.mc-default {
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: $brand; color: #fff;
}
.mc-ctx {
  font-size: 11px; padding: 1px 5px; border-radius: 4px;
  background: $bg-elevated;
}
.mc-id {
  font-size: 11px; font-family: monospace;
  margin-left: auto;
}
.mc-ops { display: flex; gap: 2px; }
.mc-edit, .mc-del {
  width: 22px; height: 22px; border: none; border-radius: 4px;
  background: transparent; color: $text-tertiary; cursor: pointer;
  font-size: 13px; line-height: 1;
  &:hover { background: $bg-panel-2; color: $text-primary; }
  &.on { background: $brand-soft; color: $brand; }
}
.mc-del:hover { background: $danger; color: #fff; }
.model-row-edit {
  display: flex; gap: $space-3; flex-wrap: wrap;
  padding: 8px 12px 12px;
  border-top: 1px dashed $border-subtle;
  background: $bg-panel-2;
}
.mre-fld {
  display: flex; flex-direction: column; gap: 3px;
  flex: 1; min-width: 140px;
  span { font-size: 11px; color: $text-secondary; }
  em { font-style: normal; color: $danger; }
  input {
    height: 30px; padding: 0 8px;
    background: $bg-panel; border: 1px solid $border-subtle;
    border-radius: $radius-md; color: $text-primary; font-size: 12px; outline: none;
    &:focus { border-color: $brand; }
  }
}
.mre-ctx { max-width: 140px; flex: 0 0 140px; }
.model-empty { font-size: 12px; padding: 4px 0; }
.model-add {
  display: flex; gap: $space-2;
  input {
    flex: 1; height: 32px; padding: 0 $space-3;
    background: $bg-panel; border: 1px solid $border-subtle;
    border-radius: $radius-md; color: $text-primary; font-size: 12px; outline: none;
    &:focus { border-color: $brand; }
  }
}
.provider-list { display: flex; flex-direction: column; gap: 2px; }
.provider-item {
  display: flex; align-items: center; justify-content: space-between; gap: $space-4;
  padding: $space-3 $space-4; border-radius: $radius-md;
  border: 1px solid transparent;
  &:hover { background: $bg-panel-2; }
  &.active { border-color: $brand; background: $brand-soft; }
  .pi-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: $space-2; }
  .pi-tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: $brand; color: #fff; }
  .pi-meta { font-size: 11px; margin-top: 2px; }
  .pi-key { font-size: 11px; margin-top: 2px; }
  .pi-actions { display: flex; gap: $space-2; flex-shrink: 0; }
  .danger { color: $danger; }
}
.add-row { margin-top: $space-3; }
.test-msg {
  margin-top: $space-3; font-size: 12px; color: $success;
  &.err { color: $danger; }
}
.form-err {
  display: block; margin-top: 4px; font-size: 11px; color: $danger;
}

.btn {
  height: 36px; padding: 0 $space-4; border-radius: $radius-md;
  font-size: 13px; border: 1px solid transparent;
  &-sm { height: 30px; padding: 0 $space-3; }
  &-primary { background: $brand; color: #fff; &:hover { background: $brand-hover; } }
  &-ghost { background: $bg-panel-2; color: $text-secondary; border-color: $border-subtle; &:hover { color: $text-primary; } }
  .danger, &-ghost.danger { color: $danger; }
}
.muted { color: $text-secondary; }
.danger { color: $danger; }
</style>
