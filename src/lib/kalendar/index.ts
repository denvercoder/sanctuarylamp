/**
 * @sanctuarylamp/kalendar — the 1962 Roman Calendar, so far as the Rule needs it.
 *
 * SCOPE, STATED HONESTLY: this computes seasons, liturgical colours, and every day the
 * Rule of the Third Order actually predicates on — Ember Days, Rogation Days, the four
 * fasting vigils, Ash Wednesday, the Triduum, Fridays, Sundays, First Fridays and
 * Saturdays. It does NOT implement the full sanctoral cycle or the complete table of
 * precedence, so `rank` is populated only for Sundays and the principal feasts named
 * below and is `undefined` otherwise. Do not present `rank` to a user as authoritative
 * until the sanctoral lands.
 *
 * Everything here is pure and UTC — see ./date.ts for why.
 */

import { addDays, afterDow, dow, iso, nextDow, utc } from './date'
import { advent1, easter, emberAdvent, emberAutumn, fastingVigils, movable } from './computus'

export * from './date'
export * from './computus'

export type Season =
  | 'advent' | 'christmastide' | 'after-epiphany' | 'septuagesima'
  | 'lent' | 'passiontide' | 'paschaltide' | 'after-pentecost'

export type Colour = 'white' | 'red' | 'green' | 'violet' | 'black' | 'rose'

export type DayInfo = {
  date: Date
  iso: string
  season: Season
  colour: Colour
  /** Human name of the day, where we have one. Not a full ordo entry. */
  title?: string
  /** 1 = first class … 4 = feria. Undefined where the sanctoral is not implemented. */
  rank?: 1 | 2 | 3 | 4
  /** Predicate strings a Rule item can match on. See docs/SCHEMA.md. */
  flags: Set<string>
  /** True when the Church herself extinguishes the sanctuary lamp. See docs/COLOR.md. */
  lampExtinguished: boolean
}

const DOW_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function season(d: Date): Season {
  const y = d.getUTCFullYear()
  const t = d.getTime()
  if (t >= advent1(y).getTime()) {
    return t <= utc(y, 12, 24).getTime() ? 'advent' : 'christmastide'
  }
  if (t <= utc(y, 1, 13).getTime()) return 'christmastide'
  if (t < movable(y, 'septuagesima').getTime()) return 'after-epiphany'
  if (t < movable(y, 'ashWednesday').getTime()) return 'septuagesima'
  if (t < movable(y, 'passionSunday').getTime()) return 'lent'
  if (t < easter(y).getTime()) return 'passiontide'
  if (t <= movable(y, 'paschaltideEnd').getTime()) return 'paschaltide'
  return 'after-pentecost'
}

const SEASON_COLOUR: Record<Season, Colour> = {
  advent: 'violet',
  christmastide: 'white',
  'after-epiphany': 'green',
  septuagesima: 'violet',
  lent: 'violet',
  passiontide: 'violet',
  paschaltide: 'white',
  'after-pentecost': 'green',
}

/** Ember Days for a civil year, as flag → date. */
function emberDays(y: number): Map<string, string> {
  const m = new Map<string, string>()
  const put = (wed: Date, fri: Date, sat: Date) => {
    m.set(iso(wed), 'ember-wednesday')
    m.set(iso(fri), 'ember-friday')
    m.set(iso(sat), 'ember-saturday')
  }
  put(movable(y, 'emberSpringWed'), movable(y, 'emberSpringFri'), movable(y, 'emberSpringSat'))
  put(movable(y, 'emberSummerWed'), movable(y, 'emberSummerFri'), movable(y, 'emberSummerSat'))
  const a = emberAutumn(y); put(a.wed, a.fri, a.sat)
  const v = emberAdvent(y); put(v.wed, v.fri, v.sat)
  return m
}

/** Days with a proper name and, where it is unambiguous, a colour and rank. */
function proper(d: Date): { title: string; colour?: Colour; rank?: 1 | 2 | 3 | 4 } | undefined {
  const y = d.getUTCFullYear()
  const t = d.getTime()
  const at = (name: Parameters<typeof movable>[1]) => movable(y, name).getTime() === t
  const on = (m: number, day: number) => utc(y, m, day).getTime() === t

  if (at('septuagesima')) return { title: 'Septuagesima', colour: 'violet', rank: 2 }
  if (at('sexagesima')) return { title: 'Sexagesima', colour: 'violet', rank: 2 }
  if (at('quinquagesima')) return { title: 'Quinquagesima', colour: 'violet', rank: 2 }
  if (at('ashWednesday')) return { title: 'Ash Wednesday', colour: 'violet', rank: 1 }
  if (at('passionSunday')) return { title: 'Passion Sunday', colour: 'violet', rank: 1 }
  if (at('palmSunday')) return { title: 'Palm Sunday', colour: 'violet', rank: 1 }
  if (at('maundyThursday')) return { title: 'Maundy Thursday', colour: 'white', rank: 1 }
  if (at('goodFriday')) return { title: 'Good Friday', colour: 'black', rank: 1 }
  if (at('holySaturday')) return { title: 'Holy Saturday', colour: 'black', rank: 1 }
  if (at('easter')) return { title: 'Easter Sunday', colour: 'white', rank: 1 }
  if (at('ascension')) return { title: 'the Ascension', colour: 'white', rank: 1 }
  if (at('vigilOfPentecost')) return { title: 'the Vigil of Pentecost', colour: 'violet', rank: 2 }
  if (at('pentecost')) return { title: 'Pentecost', colour: 'red', rank: 1 }
  if (at('trinity')) return { title: 'Trinity Sunday', colour: 'white', rank: 1 }
  if (at('corpusChristi')) return { title: 'Corpus Christi', colour: 'white', rank: 1 }
  if (at('sacredHeart')) return { title: 'the Sacred Heart', colour: 'white', rank: 1 }

  // Gaudete and Laetare — the only two rose days in the year.
  if (addDays(advent1(y), 14).getTime() === t) return { title: 'Gaudete Sunday', colour: 'rose', rank: 2 }
  if (movable(y, 'easter').getTime() - t === 21 * 86_400_000) {
    return { title: 'Laetare Sunday', colour: 'rose', rank: 2 }
  }

  if (on(12, 25)) return { title: 'Christmas Day', colour: 'white', rank: 1 }
  if (on(1, 1)) return { title: 'the Circumcision', colour: 'white', rank: 1 }
  if (on(1, 6)) return { title: 'the Epiphany', colour: 'white', rank: 1 }
  if (on(2, 2)) return { title: 'the Purification', colour: 'white', rank: 2 }
  if (on(3, 19)) return { title: 'St Joseph', colour: 'white', rank: 1 }
  if (on(3, 25)) return { title: 'the Annunciation', colour: 'white', rank: 1 }
  if (on(6, 24)) return { title: 'the Nativity of St John the Baptist', colour: 'white', rank: 1 }
  if (on(6, 29)) return { title: 'SS Peter and Paul', colour: 'red', rank: 1 }
  if (on(8, 15)) return { title: 'the Assumption', colour: 'white', rank: 1 }
  if (on(9, 14)) return { title: 'the Exaltation of the Holy Cross', colour: 'red', rank: 2 }
  if (on(11, 1)) return { title: 'All Saints', colour: 'white', rank: 1 }
  if (on(11, 2)) return { title: 'All Souls', colour: 'black', rank: 1 }
  if (on(12, 8)) return { title: 'the Immaculate Conception', colour: 'white', rank: 1 }
  return undefined
}

export function dayInfo(d: Date): DayInfo {
  const y = d.getUTCFullYear()
  const key = iso(d)
  const s = season(d)
  const flags = new Set<string>()

  flags.add(`season:${s}`)
  const weekday = DOW_NAMES[dow(d)]!
  flags.add(`day:${weekday}`)

  // Ember Days.
  const ember = emberDays(y).get(key)
  if (ember) flags.add(`day:${ember}`)

  // Rogation Days — the Monday, Tuesday and Wednesday before the Ascension.
  for (const n of ['rogationMonday', 'rogationTuesday', 'rogationWednesday'] as const) {
    if (movable(y, n).getTime() === d.getTime()) flags.add('day:rogation')
  }

  // The named penitential days.
  if (movable(y, 'ashWednesday').getTime() === d.getTime()) flags.add('day:ash-wednesday')
  if (movable(y, 'goodFriday').getTime() === d.getTime()) flags.add('day:good-friday')
  if (movable(y, 'holySaturday').getTime() === d.getTime()) flags.add('day:holy-saturday')
  if (movable(y, 'maundyThursday').getTime() === d.getTime()) flags.add('day:maundy-thursday')

  // Vigils. The four that carry a fast, plus 7 December which the 1962 calendar dropped
  // but the 2024 Canadian edition keeps for Society priests.
  for (const v of fastingVigils(y)) if (v.date.getTime() === d.getTime()) flags.add(`day:${v.id}`)
  if (utc(y, 12, 7).getTime() === d.getTime()) flags.add('day:vigil-of:immaculate-conception')

  // First Friday and First Saturday of the calendar month.
  const firstOfMonth = utc(y, d.getUTCMonth() + 1, 1)
  if (nextDow(firstOfMonth, 5).getTime() === d.getTime()) flags.add('day:first-friday')
  if (nextDow(firstOfMonth, 6).getTime() === d.getTime()) flags.add('day:first-saturday')

  // The All Souls octave — 1 to 8 November, when the indulgence for the dead applies.
  if (d.getTime() >= utc(y, 11, 1).getTime() && d.getTime() <= utc(y, 11, 8).getTime()) {
    flags.add('octave:all-souls')
  }

  const p = proper(d)
  if (p?.rank !== undefined) flags.add(`rank:${p.rank}`)
  else if (dow(d) === 0) flags.add('rank:2') // a Sunday outranks a feria

  // The tabernacle is empty from the Mass of Holy Thursday until the Easter Vigil.
  // At day granularity that is Good Friday and Holy Saturday; Holy Thursday evening is
  // a time-of-day condition, resolved where notifications are.
  const lampExtinguished = flags.has('day:good-friday') || flags.has('day:holy-saturday')

  return {
    date: d,
    iso: key,
    season: s,
    colour: p?.colour ?? SEASON_COLOUR[s],
    title: p?.title,
    rank: p?.rank ?? (dow(d) === 0 ? 2 : undefined),
    flags,
    lampExtinguished,
  }
}

/** Does a day satisfy a predicate from a Rule's `onlyIf` / `onDays`? */
export function matches(info: DayInfo, predicate: string): boolean {
  if (info.flags.has(predicate)) return true
  // rank:<=N
  const m = /^rank:<=(\d)$/.exec(predicate)
  if (m && info.rank !== undefined) return info.rank <= Number(m[1])
  return false
}

const COLOUR_NAME: Record<Colour, string> = {
  white: 'white', red: 'red', green: 'green',
  violet: 'violet', black: 'black', rose: 'rose',
}

const SEASON_NAME: Record<Season, string> = {
  advent: 'Advent', christmastide: 'Christmastide',
  'after-epiphany': 'Time after Epiphany', septuagesima: 'Septuagesima',
  lent: 'Lent', passiontide: 'Passiontide', paschaltide: 'Paschaltide',
  'after-pentecost': 'Time after Pentecost',
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The ordo line: what a breviary cannot tell you about itself.
 *
 * This app does not reproduce the office — people pray it from their own books. What
 * software is actually good for is saying WHICH office, and in which colour, so the
 * ribbons go in the right places. See docs/PLAN.md §8.
 */
export function ordoLine(info: DayInfo): {
  day: string; season: string; colour: string; rank?: number; antiphon: string
} {
  const ember = [...info.flags].find((f) => f.startsWith('day:ember-'))
  const day = info.title
    ?? (ember ? `Ember ${ember.split('-').at(-1)!.replace(/^./, (c) => c.toUpperCase())}` : undefined)
    ?? (info.flags.has('day:rogation') ? 'Rogation Day' : undefined)
    ?? WEEKDAY[dow(info.date)]!
  return {
    day,
    season: SEASON_NAME[info.season],
    colour: COLOUR_NAME[info.colour],
    rank: info.rank,
    antiphon: marianAntiphon(info) === 'regina-caeli' ? 'Regina Caeli' : 'Angelus',
  }
}

/** The Regina Caeli replaces the Angelus throughout Paschaltide. */
export function marianAntiphon(info: DayInfo): 'regina-caeli' | 'angelus' {
  return info.season === 'paschaltide' ? 'regina-caeli' : 'angelus'
}

export { afterDow }
