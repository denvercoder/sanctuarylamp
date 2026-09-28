/**
 * Which book, and which volume.
 *
 * The app does not reproduce the office (docs/PLAN.md §8) — people pray it from print.
 * That makes "which volume do I pick up today, and is today's hour even in my edition?"
 * the most useful question software can answer for them, and a multi-volume breviary
 * makes it a daily one.
 *
 * Volume boundaries are DATA, marked `confirmed` where they have been checked against a
 * physical copy. Where they have not, the app says so rather than sending someone to the
 * wrong volume with quiet confidence.
 */

import type { DayInfo, Season } from './kalendar'

export type Hour =
  | 'matins' | 'lauds' | 'prime' | 'terce' | 'sext' | 'none' | 'vespers' | 'compline'

export type Volume = {
  label: string
  /** Seasons this volume covers. */
  seasons: Season[]
}

export type Book = {
  id: string
  name: string
  /** Short, unambiguous label for a button. Two of these are from the same publisher. */
  shortName: string
  publisher: string
  language: 'latin' | 'latin-english'
  volumes: Volume[]
  /** Have the volume boundaries been checked against a physical copy? */
  confirmed: boolean
  /** Which hours the edition actually contains, by day type. */
  contains: { sunday: Hour[]; other: Hour[] }
}

const ALL_HOURS: Hour[] =
  ['matins', 'lauds', 'prime', 'terce', 'sext', 'none', 'vespers', 'compline']

/**
 * The traditional two-volume split is pars hiemalis / pars aestiva, and this edition
 * labels them Tomus Prior and Tomus Alter. Where the boundary actually falls is the
 * open question — a two-volume breviary condensed from the four-volume set may turn at
 * Easter or at Pentecost, and the two choices disagree for the whole of Paschaltide.
 * Marked unconfirmed until checked against the printed volumes.
 */
export const BOOKS: Book[] = [
  {
    id: 'angelus-2vol',
    name: 'Roman Breviary, two volumes',
    shortName: 'Angelus · 2 vol, Latin',
    publisher: 'Angelus Press',
    language: 'latin',
    confirmed: false,
    // Labelled as they are printed on the spine — this edition is Latin only, and
    // "Tomus Prior" is what the user is actually looking at on the shelf.
    volumes: [
      { label: 'Tomus Prior', seasons: ['advent', 'christmastide', 'after-epiphany', 'septuagesima', 'lent', 'passiontide'] },
      { label: 'Tomus Alter', seasons: ['paschaltide', 'after-pentecost'] },
    ],
    contains: { sunday: ALL_HOURS, other: ALL_HOURS },
  },
  {
    id: 'baronius-3vol',
    name: 'Roman Breviary, three volumes',
    shortName: 'Baronius · 3 vol',
    publisher: 'Baronius Press',
    language: 'latin-english',
    confirmed: false,
    volumes: [
      { label: 'I — Advent to Lent', seasons: ['advent', 'christmastide', 'after-epiphany', 'septuagesima'] },
      { label: 'II — Lent to Pentecost', seasons: ['lent', 'passiontide', 'paschaltide'] },
      { label: 'III — Time after Pentecost', seasons: ['after-pentecost'] },
    ],
    contains: { sunday: ALL_HOURS, other: ALL_HOURS },
  },
  {
    id: 'angelus-divine-office',
    name: 'The Divine Office',
    shortName: 'Angelus · Divine Office',
    publisher: 'Angelus Press',
    language: 'latin-english',
    confirmed: true,
    volumes: [],
    contains: {
      // Every hour but Matins on Sundays; the little hours and Compline otherwise.
      sunday: ['lauds', 'prime', 'terce', 'sext', 'none', 'vespers', 'compline'],
      other: ['prime', 'terce', 'sext', 'none', 'compline'],
    },
  },
]

export function getBook(id: string | undefined): Book | undefined {
  return BOOKS.find((b) => b.id === id)
}

/** The book this person prays a given hour from. */
export function bookForHour(
  books: Partial<Record<string, string>> | undefined, hour: Hour,
): Book | undefined {
  return getBook(books?.[hour])
}

/** Which volume covers this day, if the edition has volumes. */
export function volumeFor(book: Book, info: DayInfo): Volume | undefined {
  if (book.volumes.length === 0) return undefined
  return book.volumes.find((v) => v.seasons.includes(info.season))
}

/** Does this edition actually contain the given hour today? */
export function hasHour(book: Book, info: DayInfo, hour: Hour): boolean {
  const isSunday = info.date.getUTCDay() === 0
  return (isSunday ? book.contains.sunday : book.contains.other).includes(hour)
}

export type BookGuidance = {
  book: Book
  volume?: Volume
  /** Undefined when the item is not an office. */
  present?: boolean
  /** Set when we are not certain the volume split is right. */
  caveat?: string
}

export function guide(book: Book, info: DayInfo, hour?: Hour): BookGuidance {
  const volume = volumeFor(book, info)
  return {
    book,
    volume,
    present: hour ? hasHour(book, info, hour) : undefined,
    caveat: volume && !book.confirmed
      ? 'Volume split not yet checked against a physical copy.'
      : undefined,
  }
}
