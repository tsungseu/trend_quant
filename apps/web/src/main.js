import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

// 设计令牌（CSS 变量：终端主题 + 营销固定令牌）唯一注入点
import '@trendquant/design-tokens/index.css'
// 营销站全局样式
import './styles/marketing.scss'

const app = createApp(App)
app.use(router)
app.mount('#app')
