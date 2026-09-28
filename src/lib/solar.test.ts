import { describe, expect, it } from 'vitest'
import { sunTimes } from './solar'
import { parseISO } from './kalendar'

// Denver, Colorado.
const DENVER = { lat: 39.7392, lon: -104.9903 }

const hhmmUTC = (d: Date | null) =>
  d ? `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` : null

describe('solar times', () => {
  it('puts the equinox sunrise and sunset about twelve hours apart', () => {
    const t = sunTimes(parseISO('2026-03-20'), DENVER.lat, DENVER.lon)
    const hours = (t.sunset!.getTime() - t.sunrise!.getTime()) / 3_600_000
    expect(hours).toBeGreaterThan(11.8)
    expect(hours).toBeLessThan(12.3)
  })

  it('gives Denver a long summer day and a short winter one', () => {
    const june = sunTimes(parseISO('2026-06-21'), DENVER.lat, DENVER.lon)
    const dec = sunTimes(parseISO('2026-12-21'), DENVER.lat, DENVER.lon)
    const len = (t: typeof june) => (t.sunset!.getTime() - t.sunrise!.getTime()) / 3_600_000
    expect(len(june)).toBeGreaterThan(14.7)
    expect(len(june)).toBeLessThan(15.1)
    expect(len(dec)).toBeGreaterThan(9.2)
    expect(len(dec)).toBeLessThan(9.6)
  })

  it('places solar noon near 19:00 UTC in Denver — about 105° west', () => {
    const t = sunTimes(parseISO('2026-06-21'), DENVER.lat, DENVER.lon)
    expect(hhmmUTC(t.noon)!.startsWith('19')).toBe(true)
  })

  it('orders dawn before sunrise and dusk after sunset', () => {
    const t = sunTimes(parseISO('2026-09-27'), DENVER.lat, DENVER.lon)
    expect(t.dawn!.getTime()).toBeLessThan(t.sunrise!.getTime())
    expect(t.dusk!.getTime()).toBeGreaterThan(t.sunset!.getTime())
  })

  it('returns null where the sun does not rise — Tromsø in December', () => {
    const t = sunTimes(parseISO('2026-12-21'), 69.65, 18.96)
    expect(t.sunrise).toBeNull()
    expect(t.sunset).toBeNull()
    expect(t.noon).toBeInstanceOf(Date) // solar noon still exists
  })

  it('sunrise drifts later through the autumn, as it must', () => {
    const a = sunTimes(parseISO('2026-09-01'), DENVER.lat, DENVER.lon).sunrise!
    const b = sunTimes(parseISO('2026-10-01'), DENVER.lat, DENVER.lon).sunrise!
    expect(b.getTime() % 86_400_000).toBeGreaterThan(a.getTime() % 86_400_000)
  })
})
