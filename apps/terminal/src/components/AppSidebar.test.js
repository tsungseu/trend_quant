import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppSidebar from './AppSidebar.vue'

async function sidebarAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push(path)
  await router.isReady()
  return mount(AppSidebar, { global: { plugins: [createPinia(), router] } })
}

describe('Studio navigation', () => {
  it('highlights only the active gateway page', async () => {
    const wrapper = await sidebarAt('/app/gateway/usage')
    const active = wrapper.findAll('.nav-item.active')
    expect(active).toHaveLength(1)
    expect(active[0].attributes('href')).toBe('/app/gateway/usage')
    expect(active[0].attributes('aria-current')).toBe('page')
    wrapper.unmount()
  })

  it('keeps the fund list highlighted on a detail page', async () => {
    const wrapper = await sidebarAt('/app/funds/000001')
    expect(wrapper.find('.nav-item.active').attributes('href')).toBe('/app/funds')
    wrapper.unmount()
  })

  it('retains accessible navigation names when collapsed', async () => {
    const wrapper = await sidebarAt('/app')
    await wrapper.setProps({ collapsed: true, mobileOpen: false })
    expect(wrapper.classes()).toContain('is-collapsed')
    expect(wrapper.find('[href="/app/market"]').attributes('aria-label')).toBe('行情')
    await wrapper.setProps({ mobileOpen: true })
    expect(wrapper.classes()).toContain('is-open')
    wrapper.unmount()
  })
})
