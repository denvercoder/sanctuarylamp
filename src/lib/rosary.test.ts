import { describe, expect, it } from 'vitest'
import { dayInfo, parseISO } from './kalendar'
import { MYSTERIES, mysteriesFor } from './rosary'

const on = (iso: string) => mysteriesFor(dayInfo(parseISO(iso)))

describe('the traditional weekday distribution', () => {
  // The week of 2026-09-21, an ordinary week after Pentecost.
  const cases: [string, string, string][] = [
    ['2026-09-21', 'Monday', 'joyful'],
    ['2026-09-22', 'Tuesday', 'sorrowful'],
    ['2026-09-23', 'Wednesday', 'glorious'],
    ['2026-09-24', 'Thursday', 'joyful'],
    ['2026-09-25', 'Friday', 'sorrowful'],
    ['2026-09-26', 'Saturday', 'glorious'],
  ]
  for (const [iso, name, expected] of cases) {
    it(`${name} is ${expected}`, () => expect(on(iso)).toBe(expected))
  }

  it('is NOT the modern scheme: Saturday is glorious, not joyful', () => {
    expect(on('2026-09-26')).toBe('glorious')
  })

  it('is NOT the modern scheme: Thursday is joyful, not luminous', () => {
    expect(on('2026-09-24')).toBe('joyful')
  })
})

describe('Sunday follows the season, not the weekday', () => {
  it('joyful on the Sundays from Advent until Lent', () => {
    expect(on('2026-11-29')).toBe('joyful') // Advent I
    expect(on('2026-12-27')).toBe('joyful') // Christmastide
    expect(on('2026-01-18')).toBe('joyful') // after Epiphany
    expect(on('2026-02-01')).toBe('joyful') // Septuagesima
  })

  it('sorrowful on the Sundays of Lent and Passiontide', () => {
    expect(on('2026-02-22')).toBe('sorrowful') // Lent I
    expect(on('2026-03-22')).toBe('sorrowful') // Passion Sunday
    expect(on('2026-03-29')).toBe('sorrowful') // Palm Sunday
  })

  it('glorious on the Sundays from Easter to Advent', () => {
    expect(on('2026-04-05')).toBe('glorious') // Easter
    expect(on('2026-05-24')).toBe('glorious') // Pentecost
    expect(on('2026-09-27')).toBe('glorious') // after Pentecost
    expect(on('2026-11-22')).toBe('glorious') // last Sunday before Advent
  })

  it('turns over exactly at the season boundaries', () => {
    expect(on('2026-02-15')).toBe('joyful')    // Quinquagesima — still before Lent
    expect(on('2026-02-22')).toBe('sorrowful') // first Sunday IN Lent
    expect(on('2026-04-05')).toBe('glorious')  // Easter turns it over
  })
})

describe('there are three sets, not four', () => {
  it('has exactly joyful, sorrowful and glorious', () => {
    expect(Object.keys(MYSTERIES).sort()).toEqual(['glorious', 'joyful', 'sorrowful'])
  })
  it('never returns a luminous set on any day of the year', () => {
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 86400000) {
      expect(['joyful', 'sorrowful', 'glorious']).toContain(mysteriesFor(dayInfo(new Date(t))))
    }
  })
  it('gives five decades in each set', () => {
    for (const set of Object.values(MYSTERIES)) expect(set).toHaveLength(5)
  })
})

describe('Holy Week, where the rule as written is surprising', () => {
  // The classic distribution is weekday-based except on Sundays, and says nothing about
  // Holy Week. Applied literally it gives the Joyful Mysteries on Holy Thursday and the
  // Glorious on Holy Saturday. Many people pray the Sorrowful throughout the Triduum.
  // The engine follows the rule as written and surfaces the question rather than
  // inventing an exception nobody asked for.
  it('follows the weekday rule literally through the Triduum', () => {
    expect(on('2026-04-02')).toBe('joyful')    // Maundy Thursday
    expect(on('2026-04-03')).toBe('sorrowful') // Good Friday — a Friday anyway
    expect(on('2026-04-04')).toBe('glorious')  // Holy Saturday
  })
})
