import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/linkmap/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'favicon.svg'],
      manifest: {
        name: 'LinkMap - 私人人脉地图',
        short_name: 'LinkMap',
        description: '一个帮你整理人脉、记住关系、发现连接路径的私人关系地图',
        theme_color: '#FFFFFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'any',
        start_url: '/linkmap/',
        scope: '/linkmap/',
        icons: [
          {
            src: '/linkmap/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/linkmap/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // 导航请求始终走网络，确保用户拿到最新 index.html
        navigateFallback: null,
        runtimeCaching: [
          {
            // JS/CSS 静态资源：stale-while-revalidate，优先使用缓存（不阻塞），后台静默更新
            urlPattern: /\.(?:js|css|wasm)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'linkmap-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            // 图片/字体等：缓存优先
            urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'linkmap-static',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      }
    })
  ],
})
