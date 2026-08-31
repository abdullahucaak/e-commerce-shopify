import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  server: {
    host: '127.0.0.1',
    port: 5175,
    proxy: { '/api': 'http://127.0.0.1:3000' }
  }
})
