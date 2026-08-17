import { reactive, watch } from 'vue'

// MindQuant Agent 偏好的全局单例：设置抽屉与输入区模型胶囊共享同一状态，
// 持久化到官网域 localStorage，对话服务接入后生效。

const STORAGE_KEY = 'mq-agent-prefs'

const defaults = {
  model: 'mq1',
  effort: 'standard',
  contextLength: 'standard',
  showThinking: true,
  showTodo: true,
  optimizeExperience: false,
  terminalShell: 'auto',
  terminalFont: '',
  taskNotify: true,
  notifySound: true,
  autoArchive: true,
  archiveDays: 14,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

const prefs = reactive(load())

if (typeof window !== 'undefined') {
  watch(
    prefs,
    (v) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
      } catch {
        /* 隐私模式等场景下静默失败 */
      }
    },
    { deep: true },
  )
}

export const AGENT_MODELS = [
  { value: 'mq1', label: 'MQ-1 研究', desc: '深度投研分析，结论可追溯' },
  { value: 'mq1-lite', label: 'MQ-1 Lite', desc: '快速对话，即时响应' },
]

export const AGENT_EFFORTS = [
  { value: 'standard', label: '标准' },
  { value: 'advanced', label: '进阶' },
  { value: 'extreme', label: '极致', desc: '消耗额度更快' },
]

export const AGENT_CONTEXT_LENGTHS = [
  { value: 'standard', label: '标准' },
  { value: 'long', label: '超长', desc: '接入后可用' },
]

export const AGENT_SHELLS = [
  { value: 'auto', label: '自动选择' },
  { value: 'bash', label: 'Git Bash' },
  { value: 'cmd', label: 'cmd.exe' },
  { value: 'powershell', label: 'PowerShell' },
]

export function useAgentPrefs() {
  return prefs
}

export function agentModelLabel(v) {
  return AGENT_MODELS.find((m) => m.value === v)?.label || v
}

export function agentEffortLabel(v) {
  return AGENT_EFFORTS.find((e) => e.value === v)?.label || v
}
