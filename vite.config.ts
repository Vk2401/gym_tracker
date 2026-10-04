import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// The web app is hosted on Vercel and loaded by the native shell's WebView.
// VITE_BASE is only needed if it is ever served from a sub-path.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    // Service worker precaches the whole app so it still opens offline after the first
    // load (NFR-2) even though it is served from a URL.
    VitePWA({
      // Registered from src/app/pwa.ts so updates apply at safe moments (never mid-set).
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Gym Tracker',
        short_name: 'Gym Tracker',
        theme_color: '#1e7bf2',
        background_color: '#f2f2f7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0') },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: true, port: 5173 },
  build: { target: 'es2022', sourcemap: true },
});
