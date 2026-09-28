/**
 * Easter and everything hanging off it.
 *
 * Gregorian computus (Meeus/Butcher). Exact for all Gregorian years; verified in the
 * test suite against published Easter dates including the awkward ones (1954, 1981,
 * 2038, 2049).
 */

import { addDays, afterDow, utc, type CivilDate } from './date'

export function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return utc(year, month, day)
}

/** Days relative to Easter for the movable feasts and seasons of the 1962 calendar. */
export const MOVABLE = {
  septuagesima: -63,
  sexagesima: -56,
  quinquagesima: -49,
  ashWednesday: -46,
  lent1: -42,
  // Spring (Lenten) Embertide: the Wed/Fri/Sat after the First Sunday of Lent.
  emberSpringWed: -39,
  emberSpringFri: -37,
  emberSpringSat: -36,
  passionSunday: -14,
  palmSunday: -7,
  maundyThursday: -3,
  goodFriday: -2,
  holySaturday: -1,
  easter: 0,
  rogationMonday: 36,
  rogationTuesday: 37,
  rogationWednesday: 38,
  ascension: 39,
  vigilOfPentecost: 48,
  pentecost: 49,
  // Whit Embertide: the Wed/Fri/Sat after Pentecost.
  emberSummerWed: 52,
  emberSummerFri: 54,
  emberSummerSat: 55,
  /** Paschaltide ends with the Saturday after Pentecost — the Regina Caeli's last day. */
  paschaltideEnd: 55,
  trinity: 56,
  corpusChristi: 60,
  sacredHeart: 68,
} as const

export type MovableName = keyof typeof MOVABLE

export function movable(year: number, name: MovableName): Date {
  return addDays(easter(year), MOVABLE[name])
}

/**
 * Michaelmas Embertide: the Wed/Fri/Sat after the Exaltation of the Holy Cross (14 Sept).
 * Advent Embertide: the Wed/Fri/Sat after St Lucy (13 December).
 * Both are anchored to a fixed date, so they are computed here rather than from Easter.
 */
export function emberAfter(anchor: Date): { wed: Date; fri: Date; sat: Date } {
  const wed = afterDow(anchor, 3)
  return { wed, fri: addDays(wed, 2), sat: addDays(wed, 3) }
}

export function emberAutumn(year: number) {
  return emberAfter(utc(year, 9, 14)) // Exaltation of the Holy Cross
}

export function emberAdvent(year: number) {
  return emberAfter(utc(year, 12, 13)) // St Lucy
}

/**
 * The First Sunday of Advent: the Sunday nearest to the feast of St Andrew (30 Nov),
 * equivalently the fourth Sunday before Christmas.
 */
export function advent1(year: number): Date {
  const christmas = utc(year, 12, 25)
  const dowChristmas = christmas.getUTCDay()
  // Sunday before Christmas, then back three more weeks.
  const sundayBefore = addDays(christmas, -(dowChristmas === 0 ? 7 : dowChristmas))
  return addDays(sundayBefore, -21)
}

/** The four vigils that carry a fast under the 1917 Code (c. 1252 §2). */
export function fastingVigils(year: number): { id: string; date: Date }[] {
  return [
    { id: 'vigil-of:christmas', date: utc(year, 12, 24) },
    { id: 'vigil-of:pentecost', date: movable(year, 'vigilOfPentecost') },
    { id: 'vigil-of:assumption', date: utc(year, 8, 14) },
    { id: 'vigil-of:all-saints', date: utc(year, 10, 31) },
  ]
}

export function civilEaster(year: number): CivilDate {
  const e = easter(year)
  return { y: e.getUTCFullYear(), m: e.getUTCMonth() + 1, d: e.getUTCDate() }
}
