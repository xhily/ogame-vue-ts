import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  base: './',
  build: {
    outDir: 'docs',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vue 核心框架
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) return 'vendor-vue-core'
          // Vue 生态
          if (id.includes('node_modules/vue-router')) return 'vendor-vue-router'
          if (id.includes('node_modules/pinia')) return 'vendor-pinia'
          // UI 组件库
          if (id.includes('node_modules/reka-ui')) return 'vendor-reka-ui'
          if (id.includes('node_modules/@vueuse/core')) return 'vendor-vueuse'
          if (id.includes('node_modules/lucide-vue-next')) return 'vendor-icons'
          // 工具库
          if (id.includes('node_modules/crypto-js')) return 'vendor-crypto'
          if (id.includes('node_modules/file-saver')) return 'vendor-utils'
          if (id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) return 'vendor-utils'
          // Tailwind CSS
          if (id.includes('node_modules/@tailwindcss') || id.includes('node_modules/tailwindcss')) return 'vendor-tailwind'
          // 游戏逻辑模块
          if (id.includes('/src/logic/')) return 'game-logic'
          // 配置和类型
          if (id.includes('/src/config/') || id.includes('/src/types/')) return 'game-config'
          // 本地化
          if (id.includes('/src/locales/')) return 'game-i18n'
          // 其他 node_modules 依赖
          if (id.includes('node_modules/')) return 'vendor-others'
        },
        // 优化输出文件名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  plugins: [
      vue(),
    tailwindcss(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`
        entry: 'electron/main.ts',
      },
      // Optional: Use Node.js API in the Renderer process
      renderer: {},
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // 优化依赖预构建
  optimizeDeps: { include: ['vue', 'vue-router', 'pinia', 'reka-ui', '@vueuse/core', 'lucide-vue-next', 'crypto-js', 'file-saver'] }
})
