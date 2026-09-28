/**
 * date + rule + profile + history  →  what you owe today.
 *
 * Pure, synchronous, and deliberately free of judgement: it returns what is due and what
 * has been done, and computes nothing resembling a score, a percentage or a grade.
 */

import { matches, type DayInfo } from '../kalendar'
import type {
  Cadence, Completion, Pred, Profile, Rule, RuleItem,
} from './types'

export function test(info: DayInfo, p: Pred): boolean {
  if (typeof p === 'string') return matches(info, p)
  if ('all' in p) return p.all.every((q) => test(info, q))
  if ('any' in p) return p.any.some((q) => test(info, q))
  return !test(info, p.not)
}

function anyOf(info: DayInfo, preds: Pred[] | undefined): boolean {
  if (!preds || preds.length === 0) return true
  return preds.some((p) => test(info, p))
}

/** Does this item bind this person at all, today's date aside? */
function appliesToProfile(item: RuleItem, profile: Profile): boolean {
  if (item.fromEdition && !profile.optedIn.includes(item.id)) return false
  if (item.appliesTo && !item.appliesTo.some((s) => profile.states.includes(s))) return false
  if (item.stage && !item.stage.includes(profile.stage)) return false
  return true
}

export type Due =
  | { kind: 'today' }
  | { kind: 'ongoing' }
  | { kind: 'periodic'; lastKept?: string; dueBy?: string; overdue: boolean; aimMissed: boolean }
  | { kind: 'not-today' }

const DAY = 86_400_000

function addDaysIso(isoDate: string, n: number): string {
  return new Date(Date.parse(isoDate) + n * DAY).toISOString().slice(0, 10)
}

function cadenceDue(
  cadence: Cadence, item: RuleItem, info: DayInfo, history: Completion[],
): Due {
  if ('ongoing' in cadence) return { kind: 'ongoing' }

  if ('onDays' in cadence) {
    return anyOf(info, cadence.onDays) ? { kind: 'today' } : { kind: 'not-today' }
  }

  if (cadence.every === 'day') {
    return anyOf(info, item.onlyIf) ? { kind: 'today' } : { kind: 'not-today' }
  }

  if (cadence.every === 'week' && item.onlyIf) {
    // A weekly item pinned to a weekday, e.g. Sunday Mass.
    return anyOf(info, item.onlyIf) ? { kind: 'today' } : { kind: 'not-today' }
  }

  // Everything else is periodic: an interval with a last-kept date.
  const kept = history
    .filter((c) => c.itemId === item.id && c.state === 'kept')
    .map((c) => c.date)
    .sort()
  const lastKept = kept.at(-1)

  if (!lastKept) {
    // Never yet recorded. The app does not presume you have failed at something it has
    // no record of — it simply has no record.
    return { kind: 'periodic', overdue: false, aimMissed: false }
  }

  const aimBy = advance(lastKept, cadence)
  const floorBy = 'fallback' in cadence && cadence.fallback
    ? advance(lastKept, cadence.fallback)
    : aimBy

  return {
    kind: 'periodic',
    lastKept,
    dueBy: floorBy,
    overdue: info.iso > floorBy,
    aimMissed: info.iso > aimBy,
  }
}

/**
 * Advance an ISO date by a cadence, using real calendar arithmetic.
 *
 * Months and years are NOT 31 and 366 days. A retreat kept on 1 June 2025 is due by
 * 1 June 2027, not the 3rd, and a horizon shown to a user has to be the date they would
 * write on a calendar themselves.
 */
function advance(isoDate: string, c: Cadence): string {
  if ('ongoing' in c || 'onDays' in c) return '9999-12-31'
  switch (c.every) {
    case 'day': return addDaysIso(isoDate, 1)
    case 'week': return addDaysIso(isoDate, 7)
    case 'weeks': return addDaysIso(isoDate, 7 * c.n)
    case 'month': return addMonthsIso(isoDate, 1)
    case 'months': return addMonthsIso(isoDate, c.n)
    case 'year': return addMonthsIso(isoDate, 12)
    case 'years': return addMonthsIso(isoDate, 12 * c.n)
  }
}

/** Calendar-correct month arithmetic, clamping to the end of a short month. */
function addMonthsIso(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number]
  const target = (y * 12 + (m - 1)) + months
  const ny = Math.floor(target / 12)
  const nm = (target % 12) + 1
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  const nd = Math.min(d, lastDay)
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

export type PlannedItem = {
  item: RuleItem
  due: Due
  /** Alternatives that discharge this item; the UI shows one line, not several. */
  alternatives: RuleItem[]
  /** Set when a calendar predicate swapped this item for another. */
  replaces?: RuleItem
  state?: Completion['state']
}

export type DayPlan = {
  info: DayInfo
  /** Due today and checkable. */
  obligations: PlannedItem[]
  counsels: PlannedItem[]
  /** Standing dispositions — shown, never checked off. */
  dispositions: PlannedItem[]
  /** Interval items with a horizon: confession, retreat. */
  periodic: PlannedItem[]
  /** Fasts and abstinences bound today. */
  penance: PlannedItem[]
}

const PENANCE_IDS = new Set(['fast', 'abstinence', 'fast-priests', 'fast-immaculate-conception-vigil'])

export function planDay(
  rule: Rule, info: DayInfo, profile: Profile, history: Completion[] = [],
): DayPlan {
  // The Rule, plus whatever the user has added of their own. A personal item is a
  // first-class obligation to the person who set it, and is evaluated identically.
  const items = [...rule.items, ...(profile.personalItems ?? [])]
  const byId = new Map(items.map((i) => [i.id, i]))
  const alternativeIds = new Set(items.flatMap((i) => i.satisfiedByAny ?? []))

  const plan: DayPlan = {
    info, obligations: [], counsels: [], dispositions: [], periodic: [], penance: [],
  }

  const todayCompletions = new Map(
    history.filter((c) => c.date === info.iso).map((c) => [c.itemId, c.state]),
  )

  for (const item of items) {
    // An item that only exists to discharge another is not shown on its own.
    if (alternativeIds.has(item.id)) continue
    if (!appliesToProfile(item, profile)) continue

    // A calendar predicate may swap this item for a different one entirely —
    // this is how the Angelus becomes the Regina Caeli in Paschaltide.
    let effective = item
    let replaces: RuleItem | undefined
    for (const r of item.replacedBy ?? []) {
      if (test(info, r.when)) {
        const sub = byId.get(r.itemId)
        if (sub) { replaces = item; effective = sub }
      }
    }

    const due = cadenceDue(effective.cadence, effective, info, history)
    if (due.kind === 'not-today') continue

    const alternatives = (effective.satisfiedByAny ?? [])
      .map((id) => byId.get(id))
      .filter((x): x is RuleItem => Boolean(x))

    const entry: PlannedItem = {
      item: effective, due, alternatives, replaces,
      state: todayCompletions.get(effective.id)
        ?? alternatives.map((a) => todayCompletions.get(a.id)).find(Boolean),
    }

    if (due.kind === 'ongoing') plan.dispositions.push(entry)
    else if (due.kind === 'periodic') plan.periodic.push(entry)
    else if (PENANCE_IDS.has(effective.id)) plan.penance.push(entry)
    else if (effective.kind === 'obligation') plan.obligations.push(entry)
    else plan.counsels.push(entry)
  }

  return plan
}

/**
 * How brightly the lamp burns today: 0.25 floor, 1.0 when the day's obligations are kept.
 *
 * Deliberately today-only. Yesterday cannot dim it and yesterday cannot brighten it.
 * Returns 0 when the Church herself has put the lamp out, and a flat 0.7 in scrupulosity
 * mode where it must convey nothing at all. See docs/LAMP.md.
 */
export function lumen(plan: DayPlan, profile: Profile): number {
  if (plan.info.lampExtinguished) return 0
  if (profile.scrupulosityMode) return 0.7
  const checkable = [...plan.obligations, ...plan.penance]
  if (checkable.length === 0) return 0.25
  const kept = checkable.filter((p) => p.state === 'kept' || p.state === 'excused').length
  return 0.25 + 0.75 * (kept / checkable.length)
}
