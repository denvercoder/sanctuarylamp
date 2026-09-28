import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { dayInfo, parseISO } from './kalendar'
import { parseRule } from './rule/load'
import { inSilence, remindersForDay, upcomingReminders } from './reminders'
import type { Completion, Profile } from './rule/types'

const rule = parseRule(readFileSync('rules/sspx-third-order.us-1980.yaml', 'utf8'))

const base: Profile = {
  states: ['lay', 'single'],
  stage: 'professed', optedIn: [], scrupulosityMode: false, dayStartsAtMin: 300,
  coords: { lat: 39.7392, lon: -104.9903 }, // Denver
}

const day = dayInfo(parseISO('2026-09-24'))
const ids = (rs: { itemId: string }[]) => rs.map((r) => r.itemId).sort()

describe('what gets a reminder at all', () => {
  it('rings for anchored items', () => {
    expect(ids(remindersForDay(rule, day, base))).toContain('morning-prayer')
  })

  it('never invents a time for an item that has none', () => {
    // The Rosary is a daily obligation with no anchor in the Rule and no user setting.
    const r = remindersForDay(rule, day, base)
    expect(ids(r)).not.toContain('rosary')
  })

  it('rings for it once the user sets a time', () => {
    const p: Profile = { ...base, itemTimes: { rosary: '20:00' } }
    const r = remindersForDay(rule, day, p)
    expect(ids(r)).toContain('rosary')
    expect(r.find((x) => x.itemId === 'rosary')!.fireAt.getHours()).toBe(20)
  })

  it('a user time overrides the item\'s own anchor', () => {
    const p: Profile = { ...base, itemTimes: { 'morning-prayer': '05:30' } }
    const m = remindersForDay(rule, day, p).find((x) => x.itemId === 'morning-prayer')!
    expect(m.fireAt.getHours()).toBe(5)
    expect(m.fireAt.getMinutes()).toBe(30)
  })
})

describe('nothing rings about what is already done', () => {
  it('skips an obligation already kept', () => {
    const history: Completion[] = [
      { itemId: 'morning-prayer', date: '2026-09-24', state: 'kept', at: 0 },
    ]
    expect(ids(remindersForDay(rule, day, base, history))).not.toContain('morning-prayer')
  })

  it('skips one deliberately excused', () => {
    const history: Completion[] = [
      { itemId: 'morning-prayer', date: '2026-09-24', state: 'excused', at: 0 },
    ]
    expect(ids(remindersForDay(rule, day, base, history))).not.toContain('morning-prayer')
  })
})

describe('the Great Silence', () => {
  const silence = { fromMin: 21 * 60 + 30, toMin: 6 * 60 } // 21:30 – 06:00

  it('recognises a window that wraps past midnight', () => {
    const at = (h: number, m = 0) => { const d = new Date(2026, 8, 24); d.setHours(h, m, 0, 0); return d }
    expect(inSilence(at(22), silence)).toBe(true)
    expect(inSilence(at(2), silence)).toBe(true)
    expect(inSilence(at(5, 59), silence)).toBe(true)
    expect(inSilence(at(6), silence)).toBe(false)
    expect(inSilence(at(12), silence)).toBe(false)
    expect(inSilence(at(21, 29), silence)).toBe(false)
  })

  it('suppresses a reminder that would fall inside it', () => {
    const p: Profile = { ...base, itemTimes: { rosary: '23:00' }, silence }
    expect(ids(remindersForDay(rule, day, p))).not.toContain('rosary')
  })

  it('leaves one just outside it alone', () => {
    const p: Profile = { ...base, itemTimes: { rosary: '21:00' }, silence }
    expect(ids(remindersForDay(rule, day, p))).toContain('rosary')
  })

  it('no silence set means nothing is suppressed', () => {
    const p: Profile = { ...base, itemTimes: { rosary: '03:00' } }
    expect(ids(remindersForDay(rule, day, p))).toContain('rosary')
  })
})

describe('solar anchors', () => {
  it('places morning prayer near sunrise in Denver, not at a fixed clock time', () => {
    const june = remindersForDay(rule, dayInfo(parseISO('2026-06-21')), base)
      .find((r) => r.itemId === 'morning-prayer')!
    const dec = remindersForDay(rule, dayInfo(parseISO('2026-12-21')), base)
      .find((r) => r.itemId === 'morning-prayer')!
    // Sunrise is well over an hour later in December than in June.
    const mins = (d: Date) => d.getHours() * 60 + d.getMinutes()
    expect(mins(dec.fireAt) - mins(june.fireAt)).toBeGreaterThan(60)
  })

  it('falls silent rather than guessing when there are no coordinates', () => {
    const noCoords: Profile = { ...base, coords: undefined }
    expect(ids(remindersForDay(rule, day, noCoords))).not.toContain('morning-prayer')
  })

  it('but a clock time still works without coordinates', () => {
    const noCoords: Profile = { ...base, coords: undefined, itemTimes: { rosary: '20:00' } }
    expect(ids(remindersForDay(rule, day, noCoords))).toContain('rosary')
  })
})

describe('the upcoming queue', () => {
  it('covers several days and never schedules into the past', () => {
    const from = new Date(2026, 8, 24, 12, 0, 0)
    const rs = upcomingReminders(rule, { ...base, itemTimes: { rosary: '20:00' } }, [], from, 3)
    expect(rs.length).toBeGreaterThan(3)
    for (const r of rs) expect(r.fireAt.getTime()).toBeGreaterThan(from.getTime())
    expect(new Set(rs.map((r) => r.day)).size).toBeGreaterThan(1)
  })

  it('carries the liturgical day so a late tap marks the right one', () => {
    const from = new Date(2026, 8, 24, 12, 0, 0)
    const rs = upcomingReminders(rule, { ...base, itemTimes: { rosary: '20:00' } }, [], from, 2)
    for (const r of rs) expect(r.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('picks up fast days from the calendar without being told', () => {
    const from = new Date(2026, 1, 17, 12, 0, 0) // day before Ash Wednesday 2026
    const rs = upcomingReminders(rule, { ...base, itemTimes: { fast: '07:00' } }, [], from, 3)
    expect(rs.some((r) => r.itemId === 'fast' && r.day === '2026-02-18')).toBe(true)
  })
})
