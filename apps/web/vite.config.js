import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // 本地开发 base='/'；GitHub Pages 默认部署在 /trend_quant/ 子路径，可用 VITE_PUBLIC_BASE 覆盖
    base: env.VITE_PUBLIC_BASE || (process.env.NODE_ENV === 'production' ? '/trend_quant/' : '/'),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5174,
      host: true,
      open: true,
    },
  }
})
