import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        devtools: 'src/devtools/devtools.html',
        panel: 'src/devtools/index.html',
        popup: 'public/popup.html',
        popupScript: 'public/popup.js'
      }
    },
    // Copy public assets to dist
    copyPublicDir: true
  }
})