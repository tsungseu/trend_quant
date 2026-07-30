import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdvisorView from '@/views/AdvisorView.vue'

// 避免真实 fetch 调用；组件在 mock 分支下不发起网络请求
vi.stubGlobal('fetch', vi.fn())

describe('AdvisorView 新对话', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('点击「+ 新对话」会清空消息并重置为问候语', async () => {
    const wrapper = mount(AdvisorView)
    // 初始只有 1 条问候语
    expect(wrapper.findAll('.msg').length).toBe(1)

    // 模拟用户发送一条消息
    const input = wrapper.find('input')
    await input.setValue('诊断我的持仓')
    await wrapper.find('.send').trigger('click')
    // 等待 mock 流式完成（每个 chunk 12ms，最长几百 ms）
    await new Promise((r) => setTimeout(r, 600))
    const afterSend = wrapper.findAll('.msg').length
    expect(afterSend).toBeGreaterThan(1) // 用户 + AI 回复

    // 点击新对话
    await wrapper.find('.new-chat').trigger('click')
    await wrapper.vm.$nextTick()
    const afterNew = wrapper.findAll('.msg').length
    expect(afterNew).toBe(1)
    expect(wrapper.find('.msg .md-body').text()).toContain('您好！我是您的 AI 投顾助手')
  })

  it('「+ 新对话」按钮存在且可点击', () => {
    const wrapper = mount(AdvisorView)
    const btn = wrapper.find('.new-chat')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('新对话')
  })

  it('流式输出过程中切换会话不会卡死输入框（mock Promise 必须能 resolve）', async () => {
    const wrapper = mount(AdvisorView)
    const input = wrapper.find('input')
    await input.setValue('分析今日大盘')
    await wrapper.find('.send').trigger('click')
    // 不等流式结束，立即点击「+ 新对话」触发 clearStreamTimer（中断 mock 流）
    await wrapper.find('.new-chat').trigger('click')
    // 让被中断的 send() await 走完（finally 必须执行，isStreaming 复位）
    await new Promise((r) => setTimeout(r, 150))
    // 发送按钮应恢复可用（isStreaming 已被 watch + finally 复位，不再 disabled）
    expect(wrapper.find('.send').attributes('disabled')).toBeFalsy()
    // 再次发送应当能正常工作（不会因 mock Promise 永久挂起而拒绝）
    const input2 = wrapper.find('input')
    await input2.setValue('再次提问')
    await wrapper.find('.send').trigger('click')
    await new Promise((r) => setTimeout(r, 500))
    // 新会话里应能看到这次的用户消息（多于仅问候语）
    const msgs = wrapper.findAll('.msg')
    expect(msgs.length).toBeGreaterThan(1)
  })
})
