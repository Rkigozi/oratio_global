import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
      registerType: 'autoUpdate',
      injectRegister: false,
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
        start_url: '/landing',
        categories: ['religion', 'spirituality', 'lifestyle'],
        icons: [
          { src: '/icons/icon.svg?v=oratio-wordmark-2', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icons/icon-180.png?v=oratio-wordmark-2', sizes: '180x180', type: 'image/png' },
          {
            src: '/icons/icon-192.png?v=oratio-wordmark-2',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any',
          },
          {
            src: '/icons/icon-512.png?v=oratio-wordmark-2',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
      },
      workbox: {
        // Precache only the app shell: the files needed to boot the app and
        // render the first screen offline. Lazy route chunks are cached as
        // they are visited (see the /assets runtime cache below), which keeps
        // first install/update downloads small instead of shipping every
        // route to every user.
        globPatterns: [
          'index.html',
          'manifest.webmanifest',
          'icons/*.{svg,png,ico}',
          'assets/*.css',
          'assets/index-*.js',
          'assets/shell-vendor-*.js',
          'assets/supabase-*.js',
        ],
        globIgnores: [
          // Loaded only when someone uploads an iPhone HEIC photo. Keeping it
          // out of the precache saves over 1MB during first install/update.
          'assets/heic2any-*.js',
        ],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/[a-z]/],
        // Take control immediately so a new deploy replaces the old cached app
        // without waiting for every tab to close (critical for mobile PWAs).
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Hashed asset chunks not in the precache (lazy routes, map,
            // telemetry, photo transcoding). CacheFirst because hashed URLs
            // are immutable; maxEntries bounds the cache size.
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'oratio-assets-cache',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
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

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React + router boot the app; keep the name stable so the workbox
          // precache glob can match it as part of the app shell.
          'shell-vendor': ['react', 'react-dom', 'react-router'],
          // Heavy libraries that are only needed on specific routes. Stable
          // names keep them out of the precache globs (index-*, shell-vendor-*,
          // supabase-*) so they are cached lazily at runtime instead.
          supabase: ['@supabase/supabase-js'],
          map: ['leaflet'],
          telemetry: ['@sentry/react', 'posthog-js'],
          heic2any: ['heic2any'],
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
});
