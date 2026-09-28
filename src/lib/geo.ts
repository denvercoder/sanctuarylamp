/**
 * Coordinates, for sun-anchored hours.
 *
 * Asked for only when the user has an hour that actually needs it, and declining is a
 * normal outcome: without coordinates the app simply does not schedule solar reminders,
 * rather than falling back to a guessed clock time.
 */

export type GeoResult =
  | { ok: true; coords: { lat: number; lon: number } }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout' }

export function requestCoords(): Promise<GeoResult> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve({ ok: false, reason: 'unsupported' })
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        ok: true,
        coords: {
          // Three decimals is ~100m: far more than a sunrise needs, and less to store.
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lon: Math.round(pos.coords.longitude * 1000) / 1000,
        },
      }),
      (err) => resolve({
        ok: false,
        reason: err.code === err.PERMISSION_DENIED ? 'denied'
          : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
      }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 24 * 3600_000 },
    )
  })
}
