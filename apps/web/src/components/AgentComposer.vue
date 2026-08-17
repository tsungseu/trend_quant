<script setup>
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  useAgentPrefs,
  AGENT_MODELS,
  AGENT_EFFORTS,
  AGENT_CONTEXT_LENGTHS,
  agentModelLabel,
  agentEffortLabel,
} from '@/composables/useAgentPrefs'

// Kimi 式输入卡：左「+」工具箱（附件/知识库/研究目标），
// 右模型胶囊（模型列表 + 思考强度 + 对话长度）与发送键。
// 模型偏好与设置抽屉共享 useAgentPrefs 单例。

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '向 MindQuant Agent 提问…' },
})
const emit = defineEmits(['update:modelValue', 'send', 'prefill'])

const prefs = useAgentPrefs()

const text = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const textareaRef = ref(null)
function focus() {
  nextTick(() => textareaRef.value?.focus())
}
defineExpose({ focus })

// 知识库就绪条件与终端投顾页一致：后端地址 + 登录 token
const ragApiUrl = import.meta.env.VITE_RAG_API_URL || ''
const ragToken = typeof window !== 'undefined' ? window.__TQ_RAG_TOKEN__ || '' : ''
const kbReady = computed(() => !!ragApiUrl && !!ragToken)

// ---- 弹层开关 ----
// 方位对标 Kimi：主弹层从底栏「下方」弹出、右对齐，底部空间不足时翻转为上方；
// 思考强度/对话长度为「右侧飞出」子菜单，主弹层保持打开。
const toolkitOpen = ref(false)
const modelOpen = ref(false)
const subMenu = ref('none') // 'none' | 'effort' | 'context'
const rootRef = ref(null)
const barRef = ref(null)
const openUp = ref(false)

function measureDirection() {
  const el = barRef.value || rootRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  // 下方空间不足放下弹层（实际高约 210px，留余量）时才向上翻转；
  // 覆盖快捷行是可接受的（Kimi 同样落在其快捷行上）。
  openUp.value = window.innerHeight - rect.bottom < 240
}

function toggleToolkit() {
  modelOpen.value = false
  subMenu.value = 'none'
  if (!toolkitOpen.value) measureDirection()
  toolkitOpen.value = !toolkitOpen.value
}
function toggleModelMenu() {
  toolkitOpen.value = false
  if (!modelOpen.value) {
    measureDirection()
    subMenu.value = 'none'
    modelOpen.value = true
  } else {
    modelOpen.value = false
    subMenu.value = 'none'
  }
}
function closeAll() {
  toolkitOpen.value = false
  modelOpen.value = false
  subMenu.value = 'none'
}

function onDocClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) closeAll()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// 工具箱动作
function useGoalTemplate() {
  toolkitOpen.value = false
  emit('prefill', '我的研究目标：')
  focus()
}

function send() {
  if (!text.value.trim()) return
  emit('send')
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

const icons = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
}
</script>

<template>
  <div ref="rootRef" class="a-composer">
    <textarea
      ref="textareaRef"
      v-model="text"
      class="ac-input"
      rows="2"
      :placeholder="placeholder"
      @keydown="onKeydown"
    ></textarea>

    <div ref="barRef" class="ac-bar">
      <!-- 左：+ 工具箱 -->
      <div class="ac-left">
        <button
          type="button"
          class="ac-icon-btn"
          :class="{ active: toolkitOpen }"
          aria-label="工具箱"
          @click="toggleToolkit"
        >
          <span class="ac-ico" v-html="icons.plus" aria-hidden="true"></span>
        </button>

        <Transition name="ac-pop">
          <div v-if="toolkitOpen" class="ac-popover ac-toolkit" :class="{ up: openUp }" role="menu">
            <div class="tk-item disabled" aria-disabled="true">
              <span class="tk-ico" v-html="icons.paperclip" aria-hidden="true"></span>
              <span class="tk-text">
                <span class="tk-label">文件和图片</span>
                <span class="tk-desc">接入对话服务后可上传</span>
              </span>
            </div>
            <div class="tk-item disabled" aria-disabled="true">
              <span class="tk-ico" v-html="icons.book" aria-hidden="true"></span>
              <span class="tk-text">
                <span class="tk-label">知识库</span>
                <span class="tk-desc">{{ kbReady ? '已就绪，可在对话中引用' : '需要后端地址与登录 token' }}</span>
              </span>
            </div>
            <button type="button" class="tk-item" role="menuitem" @click="useGoalTemplate">
              <span class="tk-ico" v-html="icons.target" aria-hidden="true"></span>
              <span class="tk-text">
                <span class="tk-label">研究目标</span>
                <span class="tk-desc">用一句目标开始这次研究</span>
              </span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- 右：模型胶囊 + 发送 -->
      <div class="ac-right">
        <button
          type="button"
          class="ac-model-chip"
          :class="{ active: modelOpen }"
          @click="toggleModelMenu"
        >
          <span class="am-name">{{ agentModelLabel(prefs.model) }}</span>
          <span class="am-effort">{{ agentEffortLabel(prefs.effort) }}</span>
          <span class="ac-ico sm" v-html="icons.chevronDown" aria-hidden="true"></span>
        </button>

        <button
          type="button"
          class="ac-send"
          :disabled="!text.trim()"
          :aria-label="text.trim() ? '发送' : '输入内容后发送'"
          @click="send"
        >
          <span class="ac-ico" v-html="icons.send" aria-hidden="true"></span>
        </button>

        <!-- 模型主弹层：底栏下方（空间不足时上方），右对齐避开发送键 -->
        <Transition name="ac-pop">
          <div v-if="modelOpen" class="ac-popover ac-models" :class="{ up: openUp }" role="menu">
            <button
              v-for="m in AGENT_MODELS"
              :key="m.value"
              type="button"
              class="md-item"
              :class="{ checked: prefs.model === m.value }"
              @click="prefs.model = m.value; closeAll()"
            >
              <span class="md-text">
                <span class="md-name">{{ m.label }}</span>
                <span class="md-desc">{{ m.desc }}</span>
              </span>
              <span v-if="prefs.model === m.value" class="ac-ico sm brand" v-html="icons.check" aria-hidden="true"></span>
            </button>
            <div class="md-divider"></div>
            <div class="md-sub-wrap">
              <button type="button" class="md-sub" @click="subMenu = subMenu === 'effort' ? 'none' : 'effort'">
                <span>思考强度</span>
                <span class="md-sub-right">
                  {{ agentEffortLabel(prefs.effort) }}
                  <span class="ac-ico sm" v-html="icons.chevronRight" aria-hidden="true"></span>
                </span>
              </button>

              <!-- 右侧飞出子菜单（对标 Kimi，主弹层保持打开） -->
              <Transition name="ac-pop">
                <div v-if="subMenu === 'effort'" class="ac-flyout" role="menu">
                  <button
                    v-for="o in AGENT_EFFORTS"
                    :key="o.value"
                    type="button"
                    class="md-item"
                    :class="{ checked: prefs.effort === o.value }"
                    @click="prefs.effort = o.value; closeAll()"
                  >
                    <span class="md-text">
                      <span class="md-name">{{ o.label }}</span>
                      <span v-if="o.desc" class="md-desc">{{ o.desc }}</span>
                    </span>
                    <span v-if="prefs.effort === o.value" class="ac-ico sm brand" v-html="icons.check" aria-hidden="true"></span>
                  </button>
                </div>
              </Transition>
            </div>
            <div class="md-sub-wrap">
              <button type="button" class="md-sub" @click="subMenu = subMenu === 'context' ? 'none' : 'context'">
                <span>对话长度</span>
                <span class="md-sub-right">
                  {{ prefs.contextLength === 'long' ? '超长' : '标准' }}
                  <span class="ac-ico sm" v-html="icons.chevronRight" aria-hidden="true"></span>
                </span>
              </button>

              <Transition name="ac-pop">
                <div v-if="subMenu === 'context'" class="ac-flyout" role="menu">
                  <button
                    v-for="o in AGENT_CONTEXT_LENGTHS"
                    :key="o.value"
                    type="button"
                    class="md-item"
                    :class="{ checked: prefs.contextLength === o.value }"
                    @click="prefs.contextLength = o.value; closeAll()"
                  >
                    <span class="md-text">
                      <span class="md-name">{{ o.label }}</span>
                      <span v-if="o.desc" class="md-desc">{{ o.desc }}</span>
                    </span>
                    <span v-if="prefs.contextLength === o.value" class="ac-ico sm brand" v-html="icons.check" aria-hidden="true"></span>
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

.a-composer {
  position: relative;
  background: #fff;
  border: 1px solid $border-paper;
  border-radius: $radius-xl;
  box-shadow: $shadow-md;
  transition: border-color 0.15s $ease;

  &:focus-within {
    border-color: rgba(37, 99, 235, 0.45);
  }
}

.ac-input {
  display: block;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 18px 20px 8px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.6;
  color: $text-paper-primary;
  background: transparent;

  &::placeholder {
    color: $text-paper-tertiary;
  }
}

.ac-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 12px 12px;
}

.ac-left,
.ac-right {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ac-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  color: $text-paper-secondary;
  cursor: pointer;
  transition: background-color 0.15s $ease, color 0.15s $ease;

  &:hover,
  &.active {
    background: $bg-hover;
    color: $text-paper-primary;
  }
}

.ac-ico {
  display: inline-flex;

  :deep(svg) {
    width: 18px;
    height: 18px;
  }

  &.sm :deep(svg) {
    width: 14px;
    height: 14px;
  }

  &.brand {
    color: var(--brand);
  }
}

// 模型胶囊
.ac-model-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px 0 12px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  font-family: $font-display;
  font-size: 13.5px;
  color: $text-paper-secondary;
  cursor: pointer;
  transition: background-color 0.15s $ease;

  &:hover,
  &.active {
    background: $bg-hover;
    color: $text-paper-primary;
  }

  .am-effort {
    color: $text-paper-tertiary;
  }
}

.ac-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: $radius-md;
  background: var(--brand);
  color: #fff;
  cursor: pointer;
  transition: background-color 0.15s $ease, opacity 0.15s $ease;

  &:hover:not(:disabled) {
    background: var(--brand-hover);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ac-ico :deep(svg) {
    transform: translateX(1px);
  }
}

// ---- 弹层（对标 Kimi：默认在底栏下方弹出，底部空间不足时翻转到上方） ----
.ac-popover {
  position: absolute;
  top: calc(100% + 10px);
  z-index: 70;
  min-width: 208px;
  padding: 6px;
  background: #fff;
  border: 1px solid $border-paper;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;

  &.up {
    top: auto;
    bottom: calc(100% + 10px);
  }
}

.ac-toolkit {
  left: 0;
}

.ac-models {
  right: 44px; // 避开发送键
}

// 右侧飞出子菜单：与触发行对齐，主弹层保持打开
.md-sub-wrap {
  position: relative;
}

.ac-flyout {
  position: absolute;
  left: calc(100% + 6px);
  top: -7px;
  z-index: 71;
  min-width: 176px;
  padding: 6px;
  background: #fff;
  border: 1px solid $border-paper;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
}

.ac-pop-enter-active,
.ac-pop-leave-active {
  transition: opacity 0.14s $ease, transform 0.14s $ease;
}
.ac-pop-enter-from,
.ac-pop-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
@media (prefers-reduced-motion: reduce) {
  .ac-pop-enter-active,
  .ac-pop-leave-active {
    transition: none;
  }
}

// 工具箱项
.tk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s $ease;

  &:hover:not(.disabled) {
    background: $bg-hover;
  }

  &.disabled {
    cursor: default;
    opacity: 0.55;
  }

  .tk-ico {
    display: inline-flex;
    color: $text-paper-secondary;

    :deep(svg) {
      width: 17px;
      height: 17px;
    }
  }

  &:hover:not(.disabled) .tk-ico {
    color: var(--brand);
  }
}
.tk-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.tk-label {
  font-size: 13.5px;
  font-weight: 500;
  color: $text-paper-primary;
}
.tk-desc {
  font-size: 12px;
  color: $text-paper-tertiary;
}

// 模型菜单项
.md-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s $ease;

  &:hover {
    background: $bg-hover;
  }

  &.checked .md-name {
    color: var(--brand);
  }
}
.md-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.md-name {
  font-size: 13.5px;
  font-weight: 500;
  color: $text-paper-primary;
}
.md-desc {
  font-size: 12px;
  color: $text-paper-tertiary;
}
.md-divider {
  height: 1px;
  margin: 6px 4px;
  background: $border-paper;
}
.md-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  font-size: 13.5px;
  color: $text-paper-primary;
  cursor: pointer;
  transition: background-color 0.15s $ease;

  &:hover {
    background: $bg-hover;
  }
}
.md-sub-right {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: $text-paper-tertiary;
  font-size: 12.5px;
}
</style>
