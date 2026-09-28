/**
 * Web push, and the platform facts that shape it.
 *
 * The hard one: iOS delivers push to a web app ONLY when it has been added to the Home
 * Screen (16.4+). A user who taps "enable notifications" in Safari gets nothing, forever,
 * with no error — so the app must detect that state and explain it rather than failing
 * silently. This is the single biggest product risk in the plan (docs/PLAN.md §7).
 */

export type PushState =
  | 'unsupported'          // no service worker or Push API at all
  | 'ios-needs-install'    // iOS Safari, not installed: push cannot work yet
  | 'denied'               // the user said no; only they can undo it
  | 'default'              // never asked
  | 'granted'              // subscribed or ready to be

export function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua)
    // iPadOS 13+ reports as a Mac; touch points give it away.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
}

export function pushState(): PushState {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported'
  }
  if (isIOS() && !isStandalone()) return 'ios-needs-install'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return 'default'
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export async function subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  })
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function unsubscribe(): Promise<void> {
  const sub = await currentSubscription()
  await sub?.unsubscribe()
}
