import { describe, expect, it } from 'vitest'
import { BOOKS, bookForHour, getBook, guide, hasHour, volumeFor } from './books'
import { dayInfo, parseISO } from './kalendar'

const lent = dayInfo(parseISO('2026-03-04'))       // a Wednesday in Lent
const afterPent = dayInfo(parseISO('2026-09-24'))  // a Thursday after Pentecost
const sunday = dayInfo(parseISO('2026-09-27'))

describe('editions', () => {
  it('knows all three', () => {
    expect(BOOKS.map((b) => b.id)).toEqual(
      ['angelus-2vol', 'baronius-3vol', 'angelus-divine-office'],
    )
  })

  it('picks the volume for the season', () => {
    const baronius = getBook('baronius-3vol')!
    expect(volumeFor(baronius, lent)?.label).toMatch(/^II/)
    expect(volumeFor(baronius, afterPent)?.label).toMatch(/^III/)
  })

  it('every season maps to exactly one volume, in every multi-volume edition', () => {
    for (const book of BOOKS.filter((b) => b.volumes.length > 0)) {
      const seen = new Map<string, number>()
      for (const v of book.volumes) {
        for (const s of v.seasons) seen.set(s, (seen.get(s) ?? 0) + 1)
      }
      const seasons = [
        'advent', 'christmastide', 'after-epiphany', 'septuagesima',
        'lent', 'passiontide', 'paschaltide', 'after-pentecost',
      ]
      for (const s of seasons) {
        expect(seen.get(s), `${book.id} / ${s}`).toBe(1)
      }
    }
  })

  it('the Divine Office has no volumes to choose between', () => {
    expect(volumeFor(getBook('angelus-divine-office')!, lent)).toBeUndefined()
  })
})

describe('which hours an edition actually contains', () => {
  const office = getBook('angelus-divine-office')!

  it('has Prime and Compline every day — which is what the Rule asks for', () => {
    for (const day of [lent, afterPent, sunday]) {
      expect(hasHour(office, day, 'prime')).toBe(true)
      expect(hasHour(office, day, 'compline')).toBe(true)
    }
  })

  it('has no Matins at all', () => {
    expect(hasHour(office, sunday, 'matins')).toBe(false)
    expect(hasHour(office, afterPent, 'matins')).toBe(false)
  })

  it('has Lauds and Vespers on Sunday but not on a feria', () => {
    expect(hasHour(office, sunday, 'lauds')).toBe(true)
    expect(hasHour(office, sunday, 'vespers')).toBe(true)
    expect(hasHour(office, afterPent, 'lauds')).toBe(false)
    expect(hasHour(office, afterPent, 'vespers')).toBe(false)
  })

  it('the full breviaries have every hour', () => {
    for (const id of ['angelus-2vol', 'baronius-3vol']) {
      const b = getBook(id)!
      for (const h of ['matins', 'lauds', 'vespers', 'compline'] as const) {
        expect(hasHour(b, afterPent, h)).toBe(true)
      }
    }
  })
})

describe('guidance is honest about what it does not know', () => {
  it('flags an unverified volume split rather than sending you to the wrong book', () => {
    expect(guide(getBook('baronius-3vol')!, lent).caveat).toMatch(/not yet checked/)
  })
  it('says nothing when there is nothing to caveat', () => {
    expect(guide(getBook('angelus-divine-office')!, lent).caveat).toBeUndefined()
  })
})

describe('per-hour books — one person, more than one breviary', () => {
  const books = { prime: 'baronius-3vol', lauds: 'baronius-3vol', compline: 'angelus-2vol' }

  it('routes each hour to its own book', () => {
    expect(bookForHour(books, 'prime')?.publisher).toBe('Baronius Press')
    expect(bookForHour(books, 'compline')?.publisher).toBe('Angelus Press')
  })

  it('names the volume printed on the spine, not an English paraphrase', () => {
    const angelus = bookForHour(books, 'compline')!
    expect(angelus.volumes.map((v) => v.label)).toEqual(['Tomus Prior', 'Tomus Alter'])
  })

  it('gives different volumes for the same day from different books', () => {
    const p = guide(bookForHour(books, 'prime')!, afterPent, 'prime')
    const c = guide(bookForHour(books, 'compline')!, afterPent, 'compline')
    expect(p.volume?.label).toMatch(/^III/)
    expect(c.volume?.label).toBe('Tomus Alter')
  })

  it('says nothing for an hour with no book assigned', () => {
    expect(bookForHour(books, 'vespers')).toBeUndefined()
  })
})
