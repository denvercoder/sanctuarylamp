/**
 * Sunrise, solar noon, sunset — NOAA's algorithm, in about sixty lines.
 *
 * The Angelus is not "six, twelve and six". It is a bell at dawn, noon and dusk, and
 * Prime belongs at first light. Muslim prayer apps have computed this properly for
 * fifteen years; Christian ones have almost universally not bothered. This is why the
 * app bothers. See docs/PLAN.md §5.
 *
 * Accurate to well under a minute for ordinary latitudes, which is far beyond what a
 * bell requires. Returns null inside the polar circles when the sun does not rise or set.
 */

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

/** Julian day for 00:00 UTC of a civil date. */
function julianDay(d: Date): number {
  return d.getTime() / 86_400_000 + 2440587.5
}

function solarMeanAnomaly(jc: number): number {
  return 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
}

function equationOfCentre(jc: number, m: number): number {
  return Math.sin(RAD * m) * (1.914602 - jc * (0.004817 + 0.000014 * jc))
    + Math.sin(RAD * 2 * m) * (0.019993 - 0.000101 * jc)
    + Math.sin(RAD * 3 * m) * 0.000289
}

function obliquity(jc: number): number {
  const seconds = 21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))
  return 23 + (26 + seconds / 60) / 60
}

export type SunTimes = {
  sunrise: Date | null
  noon: Date
  sunset: Date | null
  /** Civil dawn and dusk — sun 6° below the horizon. */
  dawn: Date | null
  dusk: Date | null
}

export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const jd = julianDay(date)
  const jc = (jd - 2451545) / 36525

  const geomMeanLong = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360
  const m = solarMeanAnomaly(jc)
  const trueLong = geomMeanLong + equationOfCentre(jc, m)
  const apparentLong = trueLong - 0.00569
    - 0.00478 * Math.sin(RAD * (125.04 - 1934.136 * jc))

  const eps = obliquity(jc)
    + 0.00256 * Math.cos(RAD * (125.04 - 1934.136 * jc))
  const declination = DEG * Math.asin(Math.sin(RAD * eps) * Math.sin(RAD * apparentLong))

  const y = Math.tan(RAD * eps / 2) ** 2
  const eccentricity = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
  const eqTime = 4 * DEG * (
    y * Math.sin(2 * RAD * geomMeanLong)
    - 2 * eccentricity * Math.sin(RAD * m)
    + 4 * eccentricity * y * Math.sin(RAD * m) * Math.cos(2 * RAD * geomMeanLong)
    - 0.5 * y * y * Math.sin(4 * RAD * geomMeanLong)
    - 1.25 * eccentricity * eccentricity * Math.sin(2 * RAD * m)
  )

  const noonMinutes = 720 - 4 * lon - eqTime
  const midnightUTC = Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
  )
  const at = (minutes: number) => new Date(midnightUTC + minutes * 60_000)

  /** Hour angle for a given solar altitude, or null if the sun never reaches it. */
  const hourAngle = (altitudeDeg: number): number | null => {
    const cosH = (Math.cos(RAD * (90 - altitudeDeg))
      - Math.sin(RAD * lat) * Math.sin(RAD * declination))
      / (Math.cos(RAD * lat) * Math.cos(RAD * declination))
    if (cosH > 1 || cosH < -1) return null // polar day or night
    return DEG * Math.acos(cosH)
  }

  // -0.833° accounts for refraction and the sun's apparent radius.
  const ha = hourAngle(-0.833)
  const haCivil = hourAngle(-6)

  return {
    noon: at(noonMinutes),
    sunrise: ha === null ? null : at(noonMinutes - 4 * ha),
    sunset: ha === null ? null : at(noonMinutes + 4 * ha),
    dawn: haCivil === null ? null : at(noonMinutes - 4 * haCivil),
    dusk: haCivil === null ? null : at(noonMinutes + 4 * haCivil),
  }
}

/** Resolve a Rule item's TimeAnchor to an instant on a given day. */
export function resolveAnchor(
  anchor: { clock?: string; sun?: string; offsetMin?: number; office?: string } | undefined,
  day: Date,
  coords?: { lat: number; lon: number },
): Date | null {
  if (!anchor) return null

  if (anchor.clock) {
    const [h, m] = anchor.clock.split(':').map(Number)
    // Build the local instant from the liturgical day's CALENDAR FIELDS, not from its
    // timestamp. `day` is a UTC midnight; west of Greenwich `new Date(day)` already sits
    // on the previous local date, so setHours() would land the reminder a day early —
    // 07:00 on Ash Wednesday would fire at 07:00 on Shrove Tuesday in Denver.
    return new Date(
      day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h ?? 0, m ?? 0, 0, 0,
    )
  }

  if (anchor.sun && coords) {
    const t = sunTimes(day, coords.lat, coords.lon)
    const base = t[anchor.sun as keyof SunTimes]
    if (!(base instanceof Date)) return null
    return new Date(base.getTime() + (anchor.offsetMin ?? 0) * 60_000)
  }

  return null
}
