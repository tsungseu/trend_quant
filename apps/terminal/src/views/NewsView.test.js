import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { news } from '@/mock/news'
import NewsView from './NewsView.vue'

describe('NewsView', () => {
  it('每条资讯都有可展开的正文 content', () => {
    expect(news.length).toBeGreaterThan(0)
    for (const n of news) {
      expect(n.id).toBeTruthy()
      expect(n.content?.length).toBeGreaterThan(20)
    }
  })

  it('点击资讯卡片后展示正文详情', async () => {
    const wrapper = mount(NewsView)
    const first = news[0]
    const card = wrapper.findAll('.news-card')[0]
    expect(card.exists()).toBe(true)

    expect(wrapper.find('.nc-content').exists()).toBe(false)
    await card.trigger('click')
    const body = wrapper.find('.nc-content')
    expect(body.exists()).toBe(true)
    expect(body.text().length).toBeGreaterThan(first.summary.length / 2)
    expect(wrapper.find('.expand-hint').text()).toBe('收起')
  })
})
