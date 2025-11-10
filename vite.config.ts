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
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Minification for production
    minify: 'esbuild',
    // Source maps for debugging
    sourcemap: false,
    rollupOptions: {
      input: {
        devtools: 'src/devtools/devtools.html',
        panel: 'src/devtools/index.html',
        popup: 'public/popup.html',
        popupScript: 'public/popup.js',
        'page-hook-logic': 'src/content/page-hook-logic.ts'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Don't hash the page-hook-logic file so we can reference it reliably
          if (chunkInfo.name === 'page-hook-logic') {
            return 'page-hook-logic.js';
          }
          return 'assets/[name]-[hash].js';
        },
        // Optimize chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            // Separate React into its own chunk
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // Separate Lucide icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Separate virtualization library
            if (id.includes('react-virtualized')) {
              return 'vendor-virtualized';
            }
            // Separate JSON viewer
            if (id.includes('react-json-view')) {
              return 'vendor-json';
            }
            // All other vendor code
            return 'vendor';
          }
          // Separate AI components
          if (id.includes('/AI/') || id.includes('/hooks/ai/')) {
            return 'ai-features';
          }
          // Separate panels into their own chunks for lazy loading
          if (id.includes('/panels/')) {
            return 'panels';
          }
        }
      }
    },
    // Copy public assets to dist
    copyPublicDir: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'lucide-react'
    ],
    exclude: [
      '@crxjs/vite-plugin'
    ]
  },
  // Use relative base for Chrome extension
  base: './'
})