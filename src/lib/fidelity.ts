/**
 * Fidelity over time — what this app shows instead of a streak.
 *
 * A streak measures how long you have gone without failing, which makes the most recent
 * failure the most important fact about you and turns an ordinary miss into the loss of
 * something earned. This measures something else: what each day actually held, and how
 * often you came back.
 *
 * `returns` is the deliberate inversion. A streak counts consecutive successes and resets
 * to zero on a miss; returns counts the times you began again after a day with nothing,
 * and can only ever go up. Coming back is the thing worth counting.
 */

import { addDays, advent1, dayInfo, iso, type Colour } from './kalendar'
import { planDay } from './rule/evaluate'
import type { Completion, Profile, Rule } from './rule/types'

export type DayState = 'empty' | 'none' | 'some' | 'all'

export type DayFidelity = {
  iso: string
  colour: Colour
  /** Obligations that could be checked off that day. */
  due: number
  kept: number
  excused: number
  noted: number
  state: DayState
  lampExtinguished: boolean
}

export function fidelityRange(
  rule: Rule, profile: Profile, history: Completion[], from: Date, to: Date,
): DayFidelity[] {
  const byDay = new Map<string, Completion[]>()
  for (const c of history) {
    byDay.set(c.date, [...(byDay.get(c.date) ?? []), c])
  }

  const out: DayFidelity[] = []
  for (let d = from; d.getTime() <= to.getTime(); d = addDays(d, 1)) {
    const info = dayInfo(d)
    const key = iso(d)
    const plan = planDay(rule, info, profile, history)
    const checkable = [...plan.obligations, ...plan.penance]
    const marks = byDay.get(key) ?? []
    const stateOf = (id: string) => marks.find((m) => m.itemId === id)?.state

    const kept = checkable.filter((p) => stateOf(p.item.id) === 'kept').length
    const excused = checkable.filter((p) => stateOf(p.item.id) === 'excused').length
    const noted = checkable.filter((p) => stateOf(p.item.id) === 'noted').length
    const satisfied = kept + excused

    const state: DayState =
      checkable.length === 0 ? 'empty'
      : satisfied === 0 ? 'none'
      : satisfied >= checkable.length ? 'all'
      : 'some'

    out.push({
      iso: key, colour: info.colour, due: checkable.length,
      kept, excused, noted, state, lampExtinguished: info.lampExtinguished,
    })
  }
  return out
}

export type FidelitySummary = {
  days: number
  /** Days where everything due was kept or excused. */
  full: number
  /** Days where something was kept, but not everything. */
  partial: number
  /** Days with nothing recorded at all. */
  silent: number
  /**
   * Times a day with something followed a day with nothing.
   *
   * Not a streak, and deliberately not its inverse either: it counts beginnings, so it
   * only ever increases. A long gap followed by one kept Rosary is a return.
   */
  returns: number
}

export function summarise(days: DayFidelity[]): FidelitySummary {
  let full = 0, partial = 0, silent = 0, returns = 0
  let previousWasSilent = false

  for (const d of days) {
    if (d.state === 'empty') continue
    if (d.state === 'all') full++
    else if (d.state === 'some') partial++
    else silent++

    const nowSilent = d.state === 'none'
    if (!nowSilent && previousWasSilent) returns++
    previousWasSilent = nowSilent
  }

  return { days: days.filter((d) => d.state !== 'empty').length, full, partial, silent, returns }
}

/** The liturgical year containing a date: Advent I through the Saturday before the next. */
export function liturgicalYearBounds(on: Date): { from: Date; to: Date } {
  const y = on.getUTCFullYear()
  const adventThisYear = advent1(y)
  const from = on.getTime() >= adventThisYear.getTime() ? adventThisYear : advent1(y - 1)
  const to = addDays(on.getTime() >= adventThisYear.getTime() ? advent1(y + 1) : adventThisYear, -1)
  return { from, to }
}

export type ItemSummary = {
  itemId: string
  title: string
  examenQuestion?: string
  /** Days in the range on which this item was due. */
  due: number
  kept: number
  excused: number
  noted: number
}

/**
 * Per-obligation record across a range, for the monthly recollection.
 *
 * Reports what happened, and nothing else. No percentage, no grade, no "score" — a
 * director reads the counts and the Rule's own question beside them and draws their own
 * conclusion, which is their job and not this app's.
 */
export function itemSummaries(
  rule: Rule, profile: Profile, history: Completion[], from: Date, to: Date,
): ItemSummary[] {
  const acc = new Map<string, ItemSummary>()
  const marks = new Map<string, Map<string, Completion['state']>>()
  for (const c of history) {
    if (!marks.has(c.date)) marks.set(c.date, new Map())
    marks.get(c.date)!.set(c.itemId, c.state)
  }

  for (let d = from; d.getTime() <= to.getTime(); d = addDays(d, 1)) {
    const info = dayInfo(d)
    const plan = planDay(rule, info, profile, history)
    const dayMarks = marks.get(iso(d))

    for (const planned of [...plan.obligations, ...plan.penance, ...plan.counsels]) {
      const id = planned.item.id
      if (!acc.has(id)) {
        acc.set(id, {
          itemId: id, title: planned.item.title,
          examenQuestion: planned.item.examenQuestion,
          due: 0, kept: 0, excused: 0, noted: 0,
        })
      }
      const s = acc.get(id)!
      s.due++
      const state = dayMarks?.get(id)
      if (state === 'kept') s.kept++
      else if (state === 'excused') s.excused++
      else if (state === 'noted') s.noted++
    }
  }

  return [...acc.values()].sort((a, b) => b.due - a.due)
}

/** Calendar month bounds for a YYYY-MM string. */
export function monthBounds(yyyymm: string): { from: Date; to: Date } {
  const [y, m] = yyyymm.split('-').map(Number) as [number, number]
  return {
    from: new Date(Date.UTC(y, m - 1, 1)),
    to: new Date(Date.UTC(y, m, 0)),
  }
}
