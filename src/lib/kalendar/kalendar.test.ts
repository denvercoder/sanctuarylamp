import { describe, expect, it } from 'vitest'
import { advent1, easter, emberAdvent, emberAutumn, movable } from './computus'
import { dayInfo, marianAntiphon, matches, ordoLine } from './index'
import { iso, parseISO, utc } from './date'

describe('Easter', () => {
  // Published Gregorian Easter dates, including the extremes of the possible range.
  const known: Record<number, string> = {
    1818: '1818-03-22', // earliest possible date
    1900: '1900-04-15',
    1954: '1954-04-18',
    1981: '1981-04-19',
    2000: '2000-04-23',
    2008: '2008-03-23',
    2020: '2020-04-12',
    2021: '2021-04-04',
    2022: '2022-04-17',
    2023: '2023-04-09',
    2024: '2024-03-31',
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
    2029: '2029-04-01',
    2030: '2030-04-21',
    2038: '2038-04-25', // latest possible date
    2100: '2100-03-28',
  }
  for (const [year, date] of Object.entries(known)) {
    it(`${year} falls on ${date}`, () => {
      expect(iso(easter(Number(year)))).toBe(date)
    })
  }

  it('never falls outside 22 March – 25 April, over five centuries', () => {
    for (let y = 1600; y <= 2100; y++) {
      const e = easter(y)
      const m = e.getUTCMonth() + 1
      const d = e.getUTCDate()
      expect(m === 3 || m === 4).toBe(true)
      if (m === 3) expect(d).toBeGreaterThanOrEqual(22)
      else expect(d).toBeLessThanOrEqual(25)
      expect(e.getUTCDay()).toBe(0) // always a Sunday
    }
  })
})

describe('movable feasts, 2026', () => {
  it('Ash Wednesday is 18 February', () => {
    expect(iso(movable(2026, 'ashWednesday'))).toBe('2026-02-18')
  })
  it('Pentecost is 24 May', () => {
    expect(iso(movable(2026, 'pentecost'))).toBe('2026-05-24')
  })
  it('Ascension is a Thursday', () => {
    expect(movable(2026, 'ascension').getUTCDay()).toBe(4)
  })
  it('Advent begins 29 November', () => {
    expect(iso(advent1(2026))).toBe('2026-11-29')
  })
  it('Advent I is always a Sunday, 1600–2100', () => {
    for (let y = 1600; y <= 2100; y++) expect(advent1(y).getUTCDay()).toBe(0)
  })
})

describe('Ember Days', () => {
  it('spring Embertide follows the First Sunday of Lent', () => {
    const lent1 = movable(2026, 'lent1')
    expect(lent1.getUTCDay()).toBe(0)
    expect(iso(movable(2026, 'emberSpringWed'))).toBe('2026-02-25')
    expect(iso(movable(2026, 'emberSpringFri'))).toBe('2026-02-27')
    expect(iso(movable(2026, 'emberSpringSat'))).toBe('2026-02-28')
  })

  it('Whit Embertide follows Pentecost', () => {
    expect(iso(movable(2026, 'emberSummerWed'))).toBe('2026-05-27')
    expect(iso(movable(2026, 'emberSummerSat'))).toBe('2026-05-30')
  })

  it('Michaelmas Embertide follows the Exaltation of the Holy Cross', () => {
    const a = emberAutumn(2026)
    expect(iso(a.wed)).toBe('2026-09-16')
    expect(iso(a.fri)).toBe('2026-09-18')
    expect(iso(a.sat)).toBe('2026-09-19')
  })

  it('Advent Embertide follows St Lucy', () => {
    const v = emberAdvent(2026)
    expect(iso(v.wed)).toBe('2026-12-16')
    expect(iso(v.sat)).toBe('2026-12-19')
  })

  it('always lands on a Wednesday, Friday and Saturday', () => {
    for (let y = 2020; y <= 2040; y++) {
      for (const g of [emberAutumn(y), emberAdvent(y)]) {
        expect(g.wed.getUTCDay()).toBe(3)
        expect(g.fri.getUTCDay()).toBe(5)
        expect(g.sat.getUTCDay()).toBe(6)
      }
      expect(movable(y, 'emberSpringWed').getUTCDay()).toBe(3)
      expect(movable(y, 'emberSummerWed').getUTCDay()).toBe(3)
    }
  })

  it('gives exactly twelve Ember Days per year', () => {
    let n = 0
    for (let d = utc(2026, 1, 1); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 86400000)) {
      const f = dayInfo(d).flags
      if (f.has('day:ember-wednesday') || f.has('day:ember-friday') || f.has('day:ember-saturday')) n++
    }
    expect(n).toBe(12)
  })
})

describe('seasons', () => {
  const cases: [string, string][] = [
    ['2026-01-05', 'christmastide'],
    ['2026-01-13', 'christmastide'],   // Christmastide runs to 13 January in 1962
    ['2026-01-14', 'after-epiphany'],
    ['2026-02-01', 'septuagesima'],    // Septuagesima 2026 is 1 February
    ['2026-02-17', 'septuagesima'],    // Shrove Tuesday
    ['2026-02-18', 'lent'],            // Ash Wednesday
    ['2026-03-22', 'passiontide'],     // Passion Sunday 2026
    ['2026-04-04', 'passiontide'],     // Holy Saturday
    ['2026-04-05', 'paschaltide'],     // Easter
    ['2026-05-30', 'paschaltide'],     // Saturday after Pentecost — last day
    ['2026-05-31', 'after-pentecost'], // Trinity Sunday
    ['2026-11-28', 'after-pentecost'],
    ['2026-11-29', 'advent'],
    ['2026-12-24', 'advent'],
    ['2026-12-25', 'christmastide'],
  ]
  for (const [date, expected] of cases) {
    it(`${date} is ${expected}`, () => {
      expect(dayInfo(parseISO(date)).season).toBe(expected)
    })
  }

  it('assigns every day of a year to exactly one season', () => {
    for (let d = utc(2026, 1, 1); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 86400000)) {
      expect(dayInfo(d).season).toBeTruthy()
    }
  })
})

describe('colours follow 1962, not the modern scheme', () => {
  it('Septuagesima is violet — a season the modern calendar does not have', () => {
    expect(dayInfo(parseISO('2026-02-01')).colour).toBe('violet')
  })
  it('Good Friday is black, not red', () => {
    expect(dayInfo(parseISO('2026-04-03')).colour).toBe('black')
  })
  it('All Souls is black, not violet', () => {
    expect(dayInfo(parseISO('2026-11-02')).colour).toBe('black')
  })
  it('Pentecost is red', () => {
    expect(dayInfo(parseISO('2026-05-24')).colour).toBe('red')
  })
  it('Gaudete and Laetare are the only rose days of the year', () => {
    let rose: string[] = []
    for (let d = utc(2026, 1, 1); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 86400000)) {
      if (dayInfo(d).colour === 'rose') rose.push(dayInfo(d).iso)
    }
    expect(rose).toEqual(['2026-03-15', '2026-12-13'])
  })
  it('never emits blue', () => {
    for (let d = utc(2026, 1, 1); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 86400000)) {
      expect(dayInfo(d).colour).not.toBe('blue')
    }
  })
})

describe('the fasting vigils', () => {
  it('flags all four of them in 2026', () => {
    const found = new Set<string>()
    for (let d = utc(2026, 1, 1); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 86400000)) {
      for (const f of dayInfo(d).flags) if (f.startsWith('day:vigil-of:')) found.add(f)
    }
    expect(found).toContain('day:vigil-of:christmas')
    expect(found).toContain('day:vigil-of:pentecost')
    expect(found).toContain('day:vigil-of:assumption')
    expect(found).toContain('day:vigil-of:all-saints')
  })
  it('the vigil of Pentecost is the Saturday before it', () => {
    const v = movable(2026, 'vigilOfPentecost')
    expect(v.getUTCDay()).toBe(6)
    expect(iso(v)).toBe('2026-05-23')
  })
})

describe('the lamp and the Triduum', () => {
  it('is extinguished on Good Friday and Holy Saturday only', () => {
    const out: string[] = []
    for (let d = utc(2026, 1, 1); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 86400000)) {
      if (dayInfo(d).lampExtinguished) out.push(dayInfo(d).iso)
    }
    expect(out).toEqual(['2026-04-03', '2026-04-04'])
  })
  it('burns again on Easter Sunday', () => {
    expect(dayInfo(parseISO('2026-04-05')).lampExtinguished).toBe(false)
  })
})

describe('the Regina Caeli replaces the Angelus in Paschaltide', () => {
  it('Angelus on Holy Saturday, Regina Caeli from Easter', () => {
    expect(marianAntiphon(dayInfo(parseISO('2026-04-04')))).toBe('angelus')
    expect(marianAntiphon(dayInfo(parseISO('2026-04-05')))).toBe('regina-caeli')
  })
  it('Regina Caeli through the Saturday after Pentecost, then Angelus again', () => {
    expect(marianAntiphon(dayInfo(parseISO('2026-05-30')))).toBe('regina-caeli')
    expect(marianAntiphon(dayInfo(parseISO('2026-05-31')))).toBe('angelus')
  })
})

describe('predicates', () => {
  it('matches rank:<=2 on a Sunday', () => {
    expect(matches(dayInfo(parseISO('2026-09-27')), 'rank:<=2')).toBe(true)
  })
  it('does not match rank:<=2 on an ordinary feria', () => {
    expect(matches(dayInfo(parseISO('2026-09-29')), 'rank:<=2')).toBe(false)
  })
  it('flags First Friday and First Saturday', () => {
    expect(dayInfo(parseISO('2026-10-02')).flags.has('day:first-friday')).toBe(true)
    expect(dayInfo(parseISO('2026-10-03')).flags.has('day:first-saturday')).toBe(true)
    expect(dayInfo(parseISO('2026-10-09')).flags.has('day:first-friday')).toBe(false)
  })
  it('flags the All Souls octave', () => {
    expect(dayInfo(parseISO('2026-11-08')).flags.has('octave:all-souls')).toBe(true)
    expect(dayInfo(parseISO('2026-11-09')).flags.has('octave:all-souls')).toBe(false)
  })
})

describe('the ordo line — what the breviary cannot say about itself', () => {
  it('names the day, season and colour so the ribbons can be set', () => {
    const o = ordoLine(dayInfo(parseISO('2026-02-25')))
    expect(o.day).toBe('Ember Wednesday')
    expect(o.season).toBe('Lent')
    expect(o.colour).toBe('violet')
  })
  it('names the Marian antiphon in force', () => {
    expect(ordoLine(dayInfo(parseISO('2026-04-04'))).antiphon).toBe('Angelus')
    expect(ordoLine(dayInfo(parseISO('2026-04-06'))).antiphon).toBe('Regina Caeli')
  })
  it('prefers a feast\'s proper name over the weekday', () => {
    expect(ordoLine(dayInfo(parseISO('2026-05-24'))).day).toBe('Pentecost')
    expect(ordoLine(dayInfo(parseISO('2026-05-24'))).colour).toBe('red')
  })
  it('falls back to the weekday on an ordinary feria', () => {
    expect(ordoLine(dayInfo(parseISO('2026-09-24'))).day).toBe('Thursday')
  })
})
