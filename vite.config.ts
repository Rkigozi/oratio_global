import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function copyNetlifyToml() {
  return {
    name: 'copy-netlify-toml',
    closeBundle() {
      fs.copyFileSync('netlify.toml', 'dist/netlify.toml');
    },
  };
}

export default defineConfig({
  plugins: [
    copyNetlifyToml(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Oratio — Global Prayer Platform',
        short_name: 'Oratio',
        description: 'Pray together. Anywhere.',
        theme_color: '#0A1A3A',
        background_color: '#0A1A3A',
        display: 'standalone',
        display_override: ['window-controls-overlay'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['religion', 'spirituality', 'lifestyle'],
        icons: [
          { src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/[a-z]/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
