import { describe, expect, it } from 'vitest'
import {
  compare, currentResolution, recentDays, startResolution, totalFor,
  type ExamenEntry, type Resolution,
} from './examen'

const res: Resolution = { id: 'r1', text: 'impatience', startedAt: '2026-09-01' }

const entry = (date: string, midday?: number, night?: number): ExamenEntry =>
  ({ date, resolutionId: 'r1', midday, night })

describe('one resolution at a time', () => {
  it('returns the running one', () => {
    expect(currentResolution([res])?.id).toBe('r1')
  })
  it('ignores ended ones', () => {
    expect(currentResolution([{ ...res, endedAt: '2026-09-10' }])).toBeUndefined()
  })
  it('starting a new one ends the old', () => {
    const next = startResolution([res], 'harsh speech', '2026-09-20')
    expect(next).toHaveLength(2)
    expect(next[0]!.endedAt).toBe('2026-09-20')
    expect(currentResolution(next)!.text).toBe('harsh speech')
  })
  it('does not disturb a resolution already ended', () => {
    const old: Resolution = { ...res, endedAt: '2026-09-05' }
    const next = startResolution([old], 'something', '2026-09-20')
    expect(next[0]!.endedAt).toBe('2026-09-05')
  })
})

describe('counting', () => {
  it('sums the two examinations', () => {
    expect(totalFor(entry('2026-09-20', 2, 3))).toBe(5)
  })
  it('treats a single examination as partial, not zero-for-the-day', () => {
    expect(totalFor(entry('2026-09-20', 2))).toBe(2)
  })
  it('distinguishes no record from no falls', () => {
    expect(totalFor(undefined)).toBeUndefined()
    expect(totalFor(entry('2026-09-20'))).toBeUndefined()
    expect(totalFor(entry('2026-09-20', 0, 0))).toBe(0)
  })
})

describe('the comparisons the method asks for', () => {
  const entries = [
    entry('2026-09-20', 1, 2), // 3
    entry('2026-09-21', 0, 1), // 1
    entry('2026-09-27', 2, 0), // 2
    entry('2026-09-26', 1, 1), // 2
  ]

  it('compares today with yesterday', () => {
    const c = compare(entries, 'r1', '2026-09-27')
    expect(c.today).toBe(2)
    expect(c.yesterday).toBe(2)
  })

  it('compares this week with last, as rolling seven-day windows', () => {
    const c = compare(entries, 'r1', '2026-09-27')
    // This week is the 21st to the 27th inclusive: 1 + 2 + 2.
    expect(c.thisWeek).toBe(5)
    // Last week is the 14th to the 20th: only the 20th has an entry, worth 3.
    expect(c.lastWeek).toBe(3)
  })

  it('returns undefined where nothing was recorded, rather than flattering with zero', () => {
    const c = compare([], 'r1', '2026-09-27')
    expect(c.today).toBeUndefined()
    expect(c.thisWeek).toBeUndefined()
    expect(c.lastWeek).toBeUndefined()
  })

  it('ignores entries belonging to a different resolution', () => {
    const other: ExamenEntry = { date: '2026-09-27', resolutionId: 'r2', midday: 9 }
    expect(compare([...entries, other], 'r1', '2026-09-27').today).toBe(2)
  })
})

describe('recentDays', () => {
  it('returns n days ending at the given day, oldest first', () => {
    expect(recentDays('2026-09-27', 3)).toEqual(['2026-09-25', '2026-09-26', '2026-09-27'])
  })
  it('crosses a month boundary', () => {
    expect(recentDays('2026-10-01', 2)).toEqual(['2026-09-30', '2026-10-01'])
  })
})
