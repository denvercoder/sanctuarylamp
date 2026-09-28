import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { dayInfo, parseISO } from '../kalendar'
import { openQuestions, parseRule } from './load'
import { lumen, planDay, test as testPred } from './evaluate'
import type { Completion, Profile } from './types'

const rule = parseRule(readFileSync('rules/sspx-third-order.us-1980.yaml', 'utf8'))

const married: Profile = {
  states: ['lay', 'married', 'parent'],
  stage: 'professed', optedIn: [], scrupulosityMode: false, dayStartsAtMin: 300,
}
const single: Profile = { ...married, states: ['lay', 'single'] }
const priest: Profile = { ...married, states: ['priest'] }

const ids = (xs: { item: { id: string } }[]) => xs.map((x) => x.item.id).sort()

describe('loading', () => {
  it('parses and validates', () => {
    expect(rule.id).toBe('sspx-third-order')
    expect(rule.edition.normative).toBe(true)
    expect(rule.items.length).toBeGreaterThan(20)
  })

  it('states explicitly that the Rule does not bind under sin', () => {
    expect(rule.bindingUnderSin).toBe(false)
  })

  it('has no unresolved questions left', () => {
    expect(openQuestions(rule)).toEqual([])
  })

  it('rejects a bare `on:` cadence key — the YAML boolean trap', () => {
    expect(() => parseRule(`
id: x
tradition: custom
title: X
bindingUnderSin: false
edition: { id: a, label: A, normative: true }
formation: []
items:
  - id: fast
    title: Fast
    kind: obligation
    cadence:
      on: [day:friday]
`)).toThrow(/Use "onDays:"/)
  })

  it('rejects an alternative that points nowhere', () => {
    expect(() => parseRule(`
id: x
tradition: custom
title: X
bindingUnderSin: false
edition: { id: a, label: A, normative: true }
formation: []
items:
  - id: a
    title: A
    kind: obligation
    cadence: { every: day }
    satisfiedByAny: [does-not-exist]
`)).toThrow(/unknown item/)
  })
})

describe('nested predicates', () => {
  const lentFriday = dayInfo(parseISO('2026-03-06'))
  const ordinaryFriday = dayInfo(parseISO('2026-09-25'))
  const lentTuesday = dayInfo(parseISO('2026-03-03'))

  it('conjunction: a Friday in Lent is both', () => {
    const p = { all: ['season:lent', 'day:friday'] }
    expect(testPred(lentFriday, p)).toBe(true)
    expect(testPred(ordinaryFriday, p)).toBe(false)
    expect(testPred(lentTuesday, p)).toBe(false)
  })

  it('a flat list would have matched all three — which is the bug this prevents', () => {
    for (const d of [lentFriday, ordinaryFriday, lentTuesday]) {
      const flatWouldMatch = ['season:lent', 'day:friday'].some((s) => testPred(d, s))
      expect(flatWouldMatch).toBe(true)
    }
  })

  it('negation', () => {
    expect(testPred(ordinaryFriday, { not: 'season:lent' })).toBe(true)
  })
})

describe('the daily obligations', () => {
  const plan = planDay(rule, dayInfo(parseISO('2026-09-24')), single) // an ordinary Thursday

  it('asks for morning prayer, evening prayer, the Rosary, and Mass-or-meditation', () => {
    expect(ids(plan.obligations)).toEqual(
      ['evening-prayer', 'mass-or-meditation', 'morning-prayer', 'rosary'],
    )
  })

  it('shows Mass-or-meditation as ONE line with two ways to discharge it', () => {
    const m = plan.obligations.find((p) => p.item.id === 'mass-or-meditation')!
    expect(ids(m.alternatives.map((item) => ({ item })))).toEqual(['daily-mass', 'meditation'])
  })

  it('never lists an alternative as an obligation of its own', () => {
    const all = [...plan.obligations, ...plan.counsels, ...plan.penance].map((p) => p.item.id)
    for (const alt of ['prime', 'compline', 'daily-mass', 'meditation']) {
      expect(all).not.toContain(alt)
    }
  })

  it('carries the handbook\'s own examen question on the Rosary', () => {
    const r = plan.obligations.find((p) => p.item.id === 'rosary')!
    expect(r.item.examenQuestion).toMatch(/meditating on the Mysteries/)
  })
})

describe('state of life', () => {
  it('gives a married member the family obligations', () => {
    const plan = planDay(rule, dayInfo(parseISO('2026-09-24')), married)
    expect(ids(plan.obligations)).toContain('family-evening-prayers')
    expect(ids(plan.dispositions)).toContain('traditional-schools')
  })

  it('does not give them to a single member', () => {
    const plan = planDay(rule, dayInfo(parseISO('2026-09-24')), single)
    expect(ids(plan.obligations)).not.toContain('family-evening-prayers')
    expect(ids(plan.dispositions)).not.toContain('marriage-laws')
  })

  it('binds the priests-only Lenten Friday fast to priests who opt in', () => {
    const lentFriday = dayInfo(parseISO('2026-03-06'))
    const optedIn = { ...priest, optedIn: ['fast-priests'] }
    expect(ids(planDay(rule, lentFriday, optedIn).penance)).toContain('fast-priests')
    expect(ids(planDay(rule, lentFriday, priest).penance)).not.toContain('fast-priests')
    expect(ids(planDay(rule, lentFriday, { ...married, optedIn: ['fast-priests'] }).penance))
      .not.toContain('fast-priests')
  })

  it('keeps 2024-edition items out unless opted into', () => {
    const plan = planDay(rule, dayInfo(parseISO('2026-09-24')), married)
    expect(ids(plan.dispositions)).not.toContain('mortify-media')
    const opted = planDay(rule, dayInfo(parseISO('2026-09-24')), { ...married, optedIn: ['mortify-media'] })
    expect(ids(opted.dispositions)).toContain('mortify-media')
  })
})

describe('fast and abstinence follow the calendar, not a checkbox', () => {
  const on = (isoDate: string) => ids(planDay(rule, dayInfo(parseISO(isoDate)), single).penance)

  it('Ember Wednesday in Lent brings the fast', () => {
    expect(on('2026-02-25')).toContain('fast')
  })
  it('Ash Wednesday brings the fast', () => { expect(on('2026-02-18')).toContain('fast') })
  it('Holy Saturday brings the fast — your edition names it, the 2024 one does not', () => {
    expect(on('2026-04-04')).toContain('fast')
  })
  it('the vigil of the Assumption brings the fast — the 2024 edition omits it', () => {
    expect(on('2026-08-14')).toContain('fast')
  })
  it('all four vigils are covered', () => {
    for (const d of ['2026-12-24', '2026-05-23', '2026-08-14', '2026-10-31']) {
      expect(on(d)).toContain('fast')
    }
  })
  it('every Friday brings abstinence, year-round', () => {
    for (const d of ['2026-01-02', '2026-07-03', '2026-09-25', '2026-12-04']) {
      expect(on(d)).toContain('abstinence')
    }
  })
  it('an ordinary Tuesday brings neither', () => {
    expect(on('2026-09-22')).toEqual([])
  })
  it('gives exactly eighteen fast days in 2026 for a layman', () => {
    let n = 0
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 86400000) {
      if (planDay(rule, dayInfo(new Date(t)), single).penance.some((p) => p.item.id === 'fast')) n++
    }
    expect(n).toBe(18) // 4 Embertides x 3 = 12, + Ash Wednesday + Holy Saturday + 4 vigils
  })
})

describe('periodic obligations have an aim and a floor', () => {
  const today = dayInfo(parseISO('2026-09-27'))

  it('is not overdue when never yet recorded — the app does not presume', () => {
    const p = planDay(rule, today, single).periodic.find((x) => x.item.id === 'penance')!
    expect(p.due.kind).toBe('periodic')
    if (p.due.kind === 'periodic') expect(p.due.overdue).toBe(false)
  })

  it('confession: misses the two-week aim at 20 days but not the monthly floor', () => {
    const history: Completion[] = [
      { itemId: 'penance', date: '2026-09-07', state: 'kept', at: 0 },
    ]
    const p = planDay(rule, today, single, history).periodic.find((x) => x.item.id === 'penance')!
    if (p.due.kind === 'periodic') {
      expect(p.due.aimMissed).toBe(true)
      expect(p.due.overdue).toBe(false)
    }
  })

  it('confession: breaches the floor past a month', () => {
    const history: Completion[] = [
      { itemId: 'penance', date: '2026-08-01', state: 'kept', at: 0 },
    ]
    const p = planDay(rule, today, single, history).periodic.find((x) => x.item.id === 'penance')!
    if (p.due.kind === 'periodic') expect(p.due.overdue).toBe(true)
  })

  it('the retreat runs on a two-year horizon', () => {
    const history: Completion[] = [
      { itemId: 'retreat', date: '2025-06-01', state: 'kept', at: 0 },
    ]
    const p = planDay(rule, today, single, history).periodic.find((x) => x.item.id === 'retreat')!
    if (p.due.kind === 'periodic') {
      expect(p.due.overdue).toBe(false)
      expect(p.due.dueBy).toBe('2027-06-01')
    }
  })
})

describe('the lamp', () => {
  const day = dayInfo(parseISO('2026-09-24'))

  it('burns at the floor, never dark, when nothing is kept', () => {
    expect(lumen(planDay(rule, day, single), single)).toBe(0.25)
  })

  it('brightens as obligations are kept', () => {
    const history: Completion[] = [
      { itemId: 'rosary', date: '2026-09-24', state: 'kept', at: 0 },
    ]
    const l = lumen(planDay(rule, day, single, history), single)
    expect(l).toBeGreaterThan(0.25)
    expect(l).toBeLessThan(1)
  })

  it('counts an excused obligation as kept — a miss is not a failure', () => {
    const kept: Completion[] = [{ itemId: 'rosary', date: '2026-09-24', state: 'kept', at: 0 }]
    const excused: Completion[] = [{ itemId: 'rosary', date: '2026-09-24', state: 'excused', at: 0 }]
    expect(lumen(planDay(rule, day, single, excused), single))
      .toBe(lumen(planDay(rule, day, single, kept), single))
  })

  it('reaches full when the day is complete', () => {
    const plan = planDay(rule, day, single)
    const history: Completion[] = [...plan.obligations, ...plan.penance].map((p) => ({
      itemId: p.item.id, date: '2026-09-24', state: 'kept' as const, at: 0,
    }))
    expect(lumen(planDay(rule, day, single, history), single)).toBe(1)
  })

  it('yesterday cannot dim today — this is not a streak', () => {
    const longNeglect: Completion[] = []
    for (let i = 1; i < 60; i++) {
      longNeglect.push({
        itemId: 'rosary', date: new Date(Date.UTC(2026, 8, 24) - i * 86400000)
          .toISOString().slice(0, 10), state: 'noted', at: 0,
      })
    }
    expect(lumen(planDay(rule, day, single, longNeglect), single)).toBe(0.25)
  })

  it('is out on Good Friday and Holy Saturday, because the Church puts it out', () => {
    for (const d of ['2026-04-03', '2026-04-04']) {
      expect(lumen(planDay(rule, dayInfo(parseISO(d)), single), single)).toBe(0)
    }
  })

  it('is relit on Easter', () => {
    expect(lumen(planDay(rule, dayInfo(parseISO('2026-04-05')), single), single)).toBeGreaterThan(0)
  })

  it('conveys nothing at all in scrupulosity mode', () => {
    const scrup: Profile = { ...single, scrupulosityMode: true }
    const none = lumen(planDay(rule, day, scrup), scrup)
    const plan = planDay(rule, day, scrup)
    const all: Completion[] = plan.obligations.map((p) => ({
      itemId: p.item.id, date: '2026-09-24', state: 'kept' as const, at: 0,
    }))
    expect(none).toBe(0.7)
    expect(lumen(planDay(rule, day, scrup, all), scrup)).toBe(0.7)
  })
})

describe('a custom prayer routine beyond the Rule', () => {
  const withLauds: Profile = {
    ...single,
    personalItems: [{
      id: 'personal-lauds', title: 'Lauds', kind: 'resolution',
      cadence: { every: 'day' }, prayerId: 'lauds',
    }],
  }

  it('plans personal items alongside the Rule\'s own', () => {
    const plan = planDay(rule, dayInfo(parseISO('2026-09-24')), withLauds)
    expect(ids(plan.counsels)).toContain('personal-lauds')
  })

  it('leaves the Rule file untouched — a personal item is not the Society\'s to define', () => {
    expect(rule.items.some((i) => i.id === 'personal-lauds')).toBe(false)
  })

  it('does not let a personal resolution change the lamp differently from an obligation', () => {
    const day = dayInfo(parseISO('2026-09-24'))
    expect(lumen(planDay(rule, day, withLauds), withLauds))
      .toBe(lumen(planDay(rule, day, single), single))
  })
})
