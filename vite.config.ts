import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Fail the build when a required environment variable is missing.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so an unset variable does not
 * throw — it compiles to `undefined` and the feature simply never works, with no error
 * anywhere. That cost us a deploy: the Supabase variables were absent, so the client was
 * null, so sign-in and push subscription silently did nothing while the site looked fine.
 *
 * A build that cannot produce a working app should not succeed.
 */
function requireEnv(names: string[]): Plugin {
  return {
    name: 'require-env',
    apply: 'build',
    config(_conf, { mode }) {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      const missing = names.filter((n) => !env[n] && !process.env[n])
      if (missing.length) {
        throw new Error(
          `\n\nMissing required environment variables:\n` +
          missing.map((m) => `  - ${m}`).join('\n') +
          `\n\nSet them in Netlify (Site configuration -> Environment variables) ` +
          `or in .env.local for local builds, then rebuild.\n` +
          `See docs/SETUP.md.\n`,
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [
    requireEnv([
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_VAPID_PUBLIC_KEY',
    ]),
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
