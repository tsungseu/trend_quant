<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import {
  useAgentPrefs,
  AGENT_MODELS,
  AGENT_EFFORTS,
  AGENT_CONTEXT_LENGTHS,
  AGENT_SHELLS,
} from '@/composables/useAgentPrefs'

// MindQuant Agent 设置抽屉：Agent 语境的偏好（对话显示/执行环境/任务/知识库）。
// 状态与输入区模型胶囊共享 useAgentPrefs 单例，持久化在官网域 localStorage。

const prefs = useAgentPrefs()

const models = AGENT_MODELS
const efforts = AGENT_EFFORTS
const shells = AGENT_SHELLS

const emit = defineEmits(['close'])

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="agent-settings-mask" @click.self="emit('close')">
      <aside class="agent-settings" role="dialog" aria-label="Agent 设置">
        <header class="as-head">
          <span class="as-title">设置</span>
          <button type="button" class="as-close" aria-label="关闭设置" @click="emit('close')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="as-body">
          <section class="as-group">
            <h3 class="as-group-title">模型与推理</h3>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">模型</span>
                <span class="as-desc">对话使用的模型，接入服务后可选。</span>
              </div>
              <select v-model="prefs.model" class="as-control">
                <option v-for="m in models" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">思考强度</span>
                <span class="as-desc">影响研究深度与响应速度。</span>
              </div>
              <select v-model="prefs.effort" class="as-control">
                <option v-for="e in efforts" :key="e.value" :value="e.value">{{ e.label }}</option>
              </select>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">对话长度</span>
                <span class="as-desc">超长上下文接入服务后可用。</span>
              </div>
              <select v-model="prefs.contextLength" class="as-control">
                <option v-for="c in AGENT_CONTEXT_LENGTHS" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
          </section>

          <section class="as-group">
            <h3 class="as-group-title">对话显示</h3>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">显示思考过程</span>
                <span class="as-desc">在消息流中展示完整的思考内容。</span>
              </div>
              <button type="button" class="as-switch" :class="{ on: prefs.showThinking }" @click="prefs.showThinking = !prefs.showThinking"><span class="knob"></span></button>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">显示待办</span>
                <span class="as-desc">在消息流中展示待办卡片。</span>
              </div>
              <button type="button" class="as-switch" :class="{ on: prefs.showTodo }" @click="prefs.showTodo = !prefs.showTodo"><span class="knob"></span></button>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">优化体验</span>
                <span class="as-desc">允许将对话内容用于改进模型体验，数据脱敏处理。</span>
              </div>
              <button type="button" class="as-switch" :class="{ on: prefs.optimizeExperience }" @click="prefs.optimizeExperience = !prefs.optimizeExperience"><span class="knob"></span></button>
            </div>
          </section>

          <section class="as-group">
            <h3 class="as-group-title">执行环境</h3>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">命令行 Shell</span>
                <span class="as-desc">Agent 执行命令时使用的 Shell，仅新会话生效。</span>
              </div>
              <select v-model="prefs.terminalShell" class="as-control">
                <option v-for="s in shells" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">命令行字体</span>
                <span class="as-desc">留空自动继承系统配置。</span>
              </div>
              <input v-model="prefs.terminalFont" class="as-control" placeholder="例如 MesloLGS NF, monospace" />
            </div>
          </section>

          <section class="as-group">
            <h3 class="as-group-title">任务与通知</h3>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">任务通知</span>
                <span class="as-desc">任务完成、失败或需确认时发送桌面通知。</span>
              </div>
              <button type="button" class="as-switch" :class="{ on: prefs.taskNotify }" @click="prefs.taskNotify = !prefs.taskNotify"><span class="knob"></span></button>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">通知声音</span>
                <span class="as-desc">通知开启后可单独关闭提示音。</span>
              </div>
              <button type="button" class="as-switch" :class="{ on: prefs.notifySound }" @click="prefs.notifySound = !prefs.notifySound"><span class="knob"></span></button>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">自动归档旧任务</span>
                <span class="as-desc">超过保留期的已完成任务自动归档。</span>
              </div>
              <button type="button" class="as-switch" :class="{ on: prefs.autoArchive }" @click="prefs.autoArchive = !prefs.autoArchive"><span class="knob"></span></button>
            </div>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">归档保留时长</span>
                <span class="as-desc">任务超过该时长未更新才进入归档候选。</span>
              </div>
              <div class="as-control inline">
                <input v-model.number="prefs.archiveDays" type="number" min="1" max="90" />
                <span class="unit">天</span>
              </div>
            </div>
          </section>

          <section class="as-group">
            <h3 class="as-group-title">知识库</h3>
            <div class="as-row">
              <div class="as-text">
                <span class="as-label">检索增强</span>
                <span class="as-desc">需要后端地址与登录 token；就绪后上传文档即可引用。</span>
              </div>
              <span class="as-chip">未就绪</span>
            </div>
          </section>

          <p class="as-foot">偏好保存在本地浏览器，对话服务接入后生效。语言、网络与更新等应用级设置在 Studio 终端的「应用」分组中。</p>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

.agent-settings-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.32);
  display: flex;
  justify-content: flex-end;
}

.agent-settings {
  width: 400px;
  max-width: 92vw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: $bg-paper-elevated;
  border-left: 1px solid $border-paper;
  box-shadow: $shadow-lg;
  animation: as-slide 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes as-slide {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-settings {
    animation: none;
  }
}

.as-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  flex-shrink: 0;
  padding: 0 20px;
  border-bottom: 1px solid $border-paper;
}
.as-title {
  font-family: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: $text-paper-primary;
}
.as-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $text-paper-secondary;
  cursor: pointer;
  transition: background-color 0.15s $ease, color 0.15s $ease;

  &:hover {
    background: $bg-hover;
    color: $text-paper-primary;
  }
}

.as-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: $space-5 $space-5 $space-6;
}

.as-group {
  padding: $space-4 0;

  & + .as-group {
    border-top: 1px solid $border-paper;
  }
}
.as-group-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: $text-paper-tertiary;
  text-transform: uppercase;
  margin-bottom: $space-2;
}

.as-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-4;
  padding: 10px 0;
}
.as-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.as-label {
  font-size: 13.5px;
  font-weight: 500;
  color: $text-paper-primary;
}
.as-desc {
  font-size: 12px;
  line-height: 1.5;
  color: $text-paper-tertiary;
}

.as-control {
  flex-shrink: 0;
  width: 150px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid $border-paper;
  border-radius: $radius-sm;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  color: $text-paper-primary;
  outline: none;
  transition: border-color 0.15s $ease;

  &:focus {
    border-color: rgba(37, 99, 235, 0.45);
  }

  &.inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: auto;

    input {
      width: 56px;
      height: 30px;
      border: 1px solid $border-paper;
      border-radius: $radius-sm;
      padding: 0 8px;
      font-size: 13px;
      outline: none;
    }

    .unit {
      font-size: 12px;
      color: $text-paper-tertiary;
    }
  }
}

.as-switch {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.16);
  cursor: pointer;
  transition: background-color 0.15s $ease;

  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
    transition: transform 0.15s $ease;
  }

  &.on {
    background: var(--brand);

    .knob {
      transform: translateX(18px);
    }
  }
}

.as-chip {
  flex-shrink: 0;
  height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid $border-paper;
  font-size: 12px;
  color: $text-paper-tertiary;
}

.as-foot {
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $border-paper;
  font-size: 12px;
  line-height: 1.6;
  color: $text-paper-tertiary;
}
</style>
