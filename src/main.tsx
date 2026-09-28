import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/app.css'
import { registerSW } from 'virtual:pwa-register'
import App from './App'

/**
 * Register the service worker through the plugin's helper rather than by path: in dev it
 * is served at /dev-sw.js and in production at /sw.js, and hardcoding either one gives a
 * silent MIME-type failure in the other.
 *
 * Registration failure is not fatal. Everything except notifications still works.
 */
registerSW({
  immediate: true,
  onRegisterError: (e) => console.warn('service worker registration failed', e),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
