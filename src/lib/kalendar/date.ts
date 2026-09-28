/**
 * Civil dates, handled in UTC throughout.
 *
 * A liturgical day is a calendar day, not an instant. Every date in this engine is a
 * UTC midnight so that arithmetic is exact and a user in Auckland and a user in Denver
 * computing "Ember Wednesday 2026" get the same answer. Local time enters the system in
 * exactly one place — resolving a TimeAnchor to a notification instant — and nowhere else.
 */

export type CivilDate = { y: number; m: number; d: number } // m is 1-12

export const DAY_MS = 86_400_000

export function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d))
}

export function toCivil(t: Date): CivilDate {
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

export function fromCivil(c: CivilDate): Date {
  return utc(c.y, c.m, c.d)
}

export function addDays(t: Date, n: number): Date {
  return new Date(t.getTime() + n * DAY_MS)
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime()
}

/** 0 = Sunday … 6 = Saturday */
export function dow(t: Date): number {
  return t.getUTCDay()
}

export function iso(t: Date): string {
  return t.toISOString().slice(0, 10)
}

/** Parse an ISO yyyy-mm-dd as a UTC midnight. Rejects anything else. */
export function parseISO(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) throw new Error(`not an ISO date: ${s}`)
  return utc(Number(m[1]), Number(m[2]), Number(m[3]))
}

/** The nth given weekday on or after `t`. n=1 is the first one, t itself counting. */
export function nextDow(t: Date, targetDow: number, n = 1): Date {
  let delta = (targetDow - dow(t) + 7) % 7
  delta += (n - 1) * 7
  return addDays(t, delta)
}

/** The first given weekday strictly after `t`. */
export function afterDow(t: Date, targetDow: number): Date {
  const delta = ((targetDow - dow(t) + 7) % 7) || 7
  return addDays(t, delta)
}

/** Today as a UTC midnight, derived from the user's LOCAL calendar day. */
export function todayLocal(now = new Date()): Date {
  return utc(now.getFullYear(), now.getMonth() + 1, now.getDate())
}
