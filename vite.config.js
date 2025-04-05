import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import pkg from './package.json'
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator'

export default defineConfig({
  define: {
    __APP_NAME__: JSON.stringify(pkg.name),
    __APP_TITLE__: JSON.stringify(pkg.title),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: './',
  build: {
    outDir: 'docs',
    minify: 'terser',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) return 'vendor'
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: () => {
          return 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
    },
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    }
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    vitePluginBundleObfuscator({
      log: false,
      enable: true,
      options: {
        log: false,
        compact: true,
        stringArray: true,
        renameGlobals: false,
        selfDefending: false,
        debugProtection: false,
        rotateStringArray: true,
        deadCodeInjection: false,
        stringArrayEncoding: ['none'],
        disableConsoleOutput: true,
        stringArrayThreshold: 0.75,
        controlFlowFlattening: false,
        unicodeEscapeSequence: true,
        identifierNamesGenerator: 'hexadecimal'
      },
      autoExcludeNodeModules: true
    })
  ],
  worker: {
    format: 'es'
  }
})
