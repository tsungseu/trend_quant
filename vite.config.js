import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import https from 'node:https'

// 东财对 keep-alive 并发连接会 socket hang up，每个代理新建短连接
const emAgent = new https.Agent({ keepAlive: false })

// https://vitejs.dev/config/
export default defineConfig({
  // 本地开发 base='/'；GitHub Pages 部署在 /trend_quant/ 子路径
  base: process.env.NODE_ENV === 'production' ? '/trend_quant/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    // 东方财富 dev 反代：解决浏览器跨域（股票K线 push2his / 实时报价 push2）
    // 生产部署需在 nginx 配置同样的 /em-* 反代
    // 东方财富会拦截默认 Node UA，需伪装浏览器 UA + Referer
    proxy: {
      '/em-push2his': {
        target: 'https://push2his.eastmoney.com',
        changeOrigin: true,
        secure: true,
        agent: emAgent,
        headers: {
          'Connection': 'close',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Referer': 'https://quote.eastmoney.com/',
        },
        rewrite: (p) => p.replace(/^\/em-push2his/, ''),
      },
      '/em-fundf10': {
        target: 'https://fundf10.eastmoney.com',
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Referer': 'https://fundf10.eastmoney.com/',
        },
        rewrite: (p) => p.replace(/^\/em-fundf10/, ''),
      },
    },
  }
})
