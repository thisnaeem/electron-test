import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      exclude: ['keyauth']
    },
    build: {
      rollupOptions: {
        external: ['crypto', 'child_process', 'fs', 'path', 'os'],
        input: {
          main: resolve('src/renderer/index.html'),
          license: resolve('src/renderer/license.html')
        }
      }
    }
  }
})
