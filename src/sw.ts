/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

/**
 * The service worker.
 *
 * Hand-written rather than generated, because the two things it must do — push with
 * action buttons, and working with no signal — are exactly the things a generated worker
 * makes awkward. See docs/SETUP.md.
 */

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => { void self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

type PushPayload = {
  title: string
  body?: string
  itemId?: string
  /** ISO day the obligation belongs to, so a late tap marks the right day. */
  date?: string
  tag?: string
}

/**
 * `actions` and `renotify` are valid for a service worker notification but missing from
 * lib.dom's NotificationOptions, which only describes the Notification constructor.
 */
type SWNotificationOptions = NotificationOptions & {
  renotify?: boolean
  actions?: { action: string; title: string; icon?: string }[]
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  let p: PushPayload
  try { p = event.data.json() as PushPayload } catch { return }

  const options: SWNotificationOptions = {
    body: p.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: p.tag ?? p.itemId ?? 'sanctuarylamp',
    // Prayer is not urgent in the way software usually means. Nothing vibrates twice.
    renotify: false,
    silent: false,
    data: { itemId: p.itemId, date: p.date },
    actions: p.itemId
      ? [
          { action: 'kept', title: 'Prayed' },
          { action: 'snooze', title: 'Snooze 15' },
        ]
      : [],
  }
  event.waitUntil(self.registration.showNotification(p.title, options))
})

/**
 * Acting from the lock screen without opening the app. Checking off a Rosary should not
 * require launching anything.
 */
self.addEventListener('notificationclick', (event) => {
  const { itemId, date } = (event.notification.data ?? {}) as { itemId?: string; date?: string }
  event.notification.close()

  if (event.action === 'snooze') {
    event.waitUntil(self.registration.showNotification('Snoozed', {
      body: 'In fifteen minutes.', tag: `${itemId}-snooze`, silent: true,
    }))
    return
  }

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    if (event.action === 'kept' && itemId) {
      // Hand it to an open window if there is one; otherwise queue it for next launch.
      for (const c of clients) {
        c.postMessage({ type: 'mark', itemId, date, state: 'kept' })
        return
      }
      const cache = await caches.open('pending-marks')
      const prior: unknown[] = await cache.match('/pending')
        .then((r) => (r ? r.json() : []))
        .catch(() => [])
      await cache.put('/pending', new Response(JSON.stringify(
        [...(Array.isArray(prior) ? prior : []), { itemId, date, state: 'kept', at: Date.now() }],
      )))
      return
    }

    const existing = clients[0]
    if (existing) { await existing.focus(); return }
    await self.clients.openWindow('/')
  })())
})
