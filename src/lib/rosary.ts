/**
 * Which mysteries today, under the traditional fifteen-decade Rosary.
 *
 * There are three sets, not four. The Luminous Mysteries were proposed by John Paul II
 * in *Rosarium Virginis Mariae* (2002) and have no place in a 1962 calendar — including
 * them here would be the single most obvious tell that this app did not know what it was
 * doing.
 *
 * The classic distribution: the Joyful on Mondays and Thursdays and the Sundays from
 * Advent until Lent; the Sorrowful on Tuesdays and Fridays and the Sundays of Lent; the
 * Glorious on Wednesdays and Saturdays and the Sundays from Easter to Advent.
 *
 * Note this is NOT the modern weekly scheme, which moved the Joyful to Saturday and gave
 * Thursday to the Luminous.
 *
 * OPEN QUESTION — Holy Week. The distribution is weekday-based outside Sundays and says
 * nothing about the Triduum, so applied literally it gives the Joyful Mysteries on Holy
 * Thursday and the Glorious on Holy Saturday. Many people pray the Sorrowful throughout.
 * We follow the rule as written and raise the question rather than invent an exception:
 * the engine may ask, it may not guess. See docs/NOTES.md.
 */

import { dow, type DayInfo, type Season } from './kalendar'

export type MysterySet = 'joyful' | 'sorrowful' | 'glorious'

/** Sunday follows the season rather than the weekday. */
const SUNDAY_BY_SEASON: Record<Season, MysterySet> = {
  // "the Sundays of Advent until Lent"
  advent: 'joyful',
  christmastide: 'joyful',
  'after-epiphany': 'joyful',
  septuagesima: 'joyful',
  // "the Sundays of Lent"
  lent: 'sorrowful',
  passiontide: 'sorrowful',
  // "the Sundays from Easter to Advent"
  paschaltide: 'glorious',
  'after-pentecost': 'glorious',
}

/** Sunday = 0 … Saturday = 6. */
const BY_WEEKDAY: MysterySet[] = [
  'glorious',   // Sunday — overridden by season below
  'joyful',     // Monday
  'sorrowful',  // Tuesday
  'glorious',   // Wednesday
  'joyful',     // Thursday
  'sorrowful',  // Friday
  'glorious',   // Saturday
]

export function mysteriesFor(info: DayInfo): MysterySet {
  const d = dow(info.date)
  return d === 0 ? SUNDAY_BY_SEASON[info.season] : BY_WEEKDAY[d]!
}

export const MYSTERY_NAMES: Record<MysterySet, string> = {
  joyful: 'the Joyful Mysteries',
  sorrowful: 'the Sorrowful Mysteries',
  glorious: 'the Glorious Mysteries',
}

/** The five decades of each set, by their customary titles. */
export const MYSTERIES: Record<MysterySet, string[]> = {
  joyful: [
    'The Annunciation',
    'The Visitation',
    'The Nativity',
    'The Presentation',
    'The Finding in the Temple',
  ],
  sorrowful: [
    'The Agony in the Garden',
    'The Scourging at the Pillar',
    'The Crowning with Thorns',
    'The Carrying of the Cross',
    'The Crucifixion',
  ],
  glorious: [
    'The Resurrection',
    'The Ascension',
    'The Descent of the Holy Ghost',
    'The Assumption',
    'The Coronation of Our Lady',
  ],
}

/** A one-line description for the day bar and for a notification body. */
export function mysteryLine(info: DayInfo): string {
  return MYSTERY_NAMES[mysteriesFor(info)]
}
