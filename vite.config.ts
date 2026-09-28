import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest, not generateSW: the worker is hand-written because push with
      // action buttons and true offline use are exactly what a generated worker makes
      // awkward. See src/sw.ts and docs/SETUP.md.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
      manifest: false, // public/manifest.webmanifest is authored by hand
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,ico,svg}'],
      },
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
    }),
  ],
  resolve: { alias: { '@rules': new URL('./rules', import.meta.url).pathname } },
  build: { target: 'es2022', sourcemap: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
