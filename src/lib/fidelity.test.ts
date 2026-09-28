import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseISO } from './kalendar'
import { parseRule } from './rule/load'
import {
  fidelityRange, itemSummaries, liturgicalYearBounds, monthBounds, summarise,
} from './fidelity'
import type { Completion, Profile } from './rule/types'

const rule = parseRule(readFileSync('rules/sspx-third-order.us-1980.yaml', 'utf8'))
const profile: Profile = {
  states: ['lay', 'single'], stage: 'professed', optedIn: [],
  scrupulosityMode: false, dayStartsAtMin: 300,
}

const kept = (itemId: string, date: string): Completion =>
  ({ itemId, date, state: 'kept', at: Date.parse(date) })

describe('the grid', () => {
  it('covers every day in the range inclusively', () => {
    const days = fidelityRange(rule, profile, [], parseISO('2026-09-01'), parseISO('2026-09-30'))
    expect(days).toHaveLength(30)
    expect(days[0]!.iso).toBe('2026-09-01')
    expect(days.at(-1)!.iso).toBe('2026-09-30')
  })

  it('carries the liturgical colour of each day', () => {
    const lent = fidelityRange(rule, profile, [], parseISO('2026-03-04'), parseISO('2026-03-04'))
    expect(lent[0]!.colour).toBe('violet')
    const pentecost = fidelityRange(rule, profile, [], parseISO('2026-05-24'), parseISO('2026-05-24'))
    expect(pentecost[0]!.colour).toBe('red')
  })

  it('marks a day with nothing recorded as silent, not as failure', () => {
    const [d] = fidelityRange(rule, profile, [], parseISO('2026-09-24'), parseISO('2026-09-24'))
    expect(d!.state).toBe('none')
    expect(d!.due).toBeGreaterThan(0)
    expect(d!.kept).toBe(0)
  })

  it('counts an excused obligation as satisfied', () => {
    const history: Completion[] = [
      { itemId: 'rosary', date: '2026-09-24', state: 'excused', at: 0 },
    ]
    const [d] = fidelityRange(rule, profile, history, parseISO('2026-09-24'), parseISO('2026-09-24'))
    expect(d!.excused).toBe(1)
    expect(d!.state).toBe('some')
  })

  it('reports a fully kept day', () => {
    const day = '2026-09-24'
    const all = ['morning-prayer', 'evening-prayer', 'rosary', 'mass-or-meditation']
      .map((id) => kept(id, day))
    const [d] = fidelityRange(rule, profile, all, parseISO(day), parseISO(day))
    expect(d!.state).toBe('all')
  })
})

describe('the summary counts returns, not streaks', () => {
  it('counts a return each time something follows nothing', () => {
    // kept, nothing, nothing, kept, nothing, kept  ->  two returns
    const history = [kept('rosary', '2026-09-01'), kept('rosary', '2026-09-04'),
                     kept('rosary', '2026-09-06')]
    const days = fidelityRange(rule, profile, history, parseISO('2026-09-01'), parseISO('2026-09-06'))
    expect(summarise(days).returns).toBe(2)
  })

  it('a long gap followed by one kept Rosary still counts as a return', () => {
    const history = [kept('rosary', '2026-01-01'), kept('rosary', '2026-06-01')]
    const days = fidelityRange(rule, profile, history, parseISO('2026-01-01'), parseISO('2026-06-01'))
    expect(summarise(days).returns).toBe(1)
  })

  it('never decreases — there is nothing to lose', () => {
    const history = [kept('rosary', '2026-09-01'), kept('rosary', '2026-09-05')]
    const short = summarise(fidelityRange(rule, profile, history,
      parseISO('2026-09-01'), parseISO('2026-09-05')))
    const longer = summarise(fidelityRange(rule, profile, history,
      parseISO('2026-09-01'), parseISO('2026-09-30')))
    expect(longer.returns).toBeGreaterThanOrEqual(short.returns)
  })

  it('separates full, partial and silent days', () => {
    const day = '2026-09-24'
    const all = ['morning-prayer', 'evening-prayer', 'rosary', 'mass-or-meditation']
      .map((id) => kept(id, day))
    const days = fidelityRange(rule, profile, [...all, kept('rosary', '2026-09-25')],
      parseISO('2026-09-24'), parseISO('2026-09-26'))
    const s = summarise(days)
    expect(s.full).toBe(1)
    expect(s.partial).toBe(1)
    expect(s.silent).toBe(1)
  })
})

describe('liturgical year bounds', () => {
  it('runs from Advent I to the day before the next', () => {
    const { from, to } = liturgicalYearBounds(parseISO('2026-09-27'))
    expect(from.toISOString().slice(0, 10)).toBe('2025-11-30')
    expect(to.toISOString().slice(0, 10)).toBe('2026-11-28')
  })

  it('a date in Advent belongs to the year that Advent begins', () => {
    const { from } = liturgicalYearBounds(parseISO('2026-12-05'))
    expect(from.toISOString().slice(0, 10)).toBe('2026-11-29')
  })
})

describe('performance', () => {
  it('computes a full liturgical year well inside a frame budget', () => {
    const { from, to } = liturgicalYearBounds(parseISO('2026-09-27'))
    const t0 = performance.now()
    const days = fidelityRange(rule, profile, [], from, to)
    const ms = performance.now() - t0
    expect(days.length).toBeGreaterThan(360)
    // Generous: this runs on a five-year-old phone, and it must not block paint.
    expect(ms).toBeLessThan(400)
  })
})

describe('per-item summaries for the monthly recollection', () => {
  const { from, to } = monthBounds('2026-09')

  it('counts the days each obligation was actually due', () => {
    const items = itemSummaries(rule, profile, [], from, to)
    const rosary = items.find((i) => i.itemId === 'rosary')!
    expect(rosary.due).toBe(30) // daily, all of September
    const sunday = items.find((i) => i.itemId === 'sunday-mass')!
    expect(sunday.due).toBe(4)  // four Sundays in September 2026
  })

  it('carries the Rule\'s own examen question alongside the record', () => {
    const items = itemSummaries(rule, profile, [], from, to)
    expect(items.find((i) => i.itemId === 'rosary')!.examenQuestion)
      .toMatch(/meditating on the Mysteries/)
  })

  it('separates kept, excused and noted', () => {
    const history: Completion[] = [
      kept('rosary', '2026-09-02'),
      { itemId: 'rosary', date: '2026-09-03', state: 'excused', at: 0 },
      { itemId: 'rosary', date: '2026-09-04', state: 'noted', at: 0 },
    ]
    const r = itemSummaries(rule, profile, history, from, to)
      .find((i) => i.itemId === 'rosary')!
    expect([r.kept, r.excused, r.noted]).toEqual([1, 1, 1])
  })

  it('reports counts only — no score, percentage or grade', () => {
    const items = itemSummaries(rule, profile, [], from, to)
    for (const i of items) {
      expect(Object.keys(i).sort()).toEqual(
        ['due', 'examenQuestion', 'excused', 'itemId', 'kept', 'noted', 'title'],
      )
    }
  })

  it('picks up fast days from the calendar, not from a fixed list', () => {
    const feb = monthBounds('2026-02')
    const fast = itemSummaries(rule, profile, [], feb.from, feb.to)
      .find((i) => i.itemId === 'fast')!
    // Ash Wednesday (18th) plus all three spring Ember Days (25th, 27th, 28th) —
    // the Ember Saturday still falls inside February in 2026.
    expect(fast.due).toBe(4)
  })
})

describe('monthBounds', () => {
  it('spans a whole calendar month', () => {
    const { from, to } = monthBounds('2026-02')
    expect(from.toISOString().slice(0, 10)).toBe('2026-02-01')
    expect(to.toISOString().slice(0, 10)).toBe('2026-02-28')
  })
  it('handles a 31-day month', () => {
    expect(monthBounds('2026-12').to.toISOString().slice(0, 10)).toBe('2026-12-31')
  })
})
