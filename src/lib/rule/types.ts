/**
 * The Rule Engine's types. One engine, any Catholic third order — see docs/SCHEMA.md.
 *
 * Nothing here is SSPX-specific. The SSPX Rule is the first template loaded into it.
 */

/**
 * A calendar predicate, possibly nested.
 *
 * A bare string is a flag from the calendar engine. `all` is conjunction, `any` is
 * disjunction, `not` is negation. Nesting exists because real rules need it: "all Fridays
 * in Lent" is `{ all: ['season:lent', 'day:friday'] }` and a flat list cannot say it.
 */
export type Pred = string | { all: Pred[] } | { any: Pred[] } | { not: Pred }

export type Cadence =
  | { every: 'day' }
  | { every: 'week'; count?: number }
  | { every: 'weeks'; n: number; fallback?: Cadence }
  | { every: 'month' }
  | { every: 'months'; n: number }
  | { every: 'year' }
  | { every: 'years'; n: number }
  /** Bound only on certain days. Top level is OR; nest with `all` for AND. */
  | { onDays: Pred[] }
  /** A standing disposition, not a task. Never checkable, never overdue. */
  | { ongoing: true }

export type StateOfLife = 'lay' | 'priest' | 'married' | 'single' | 'parent'

export type TimeAnchor =
  | { clock: string }
  | { sun: 'dawn' | 'sunrise' | 'noon' | 'sunset' | 'dusk'; offsetMin?: number }
  | { office: 'prime' | 'compline' }

export type ItemKind = 'obligation' | 'counsel' | 'resolution'

export type RuleItem = {
  id: string
  title: string
  text?: string
  kind: ItemKind
  cadence: Cadence
  satisfiedByAny?: string[]
  appliesTo?: StateOfLife[]
  stage?: string[]
  onlyIf?: Pred[]
  replacedBy?: { when: Pred; itemId: string }[]
  when?: TimeAnchor
  durationMin?: number
  prayerId?: string
  examenQuestion?: string
  /** Set when the item comes from an edition other than the normative one. Opt-in. */
  fromEdition?: string
  needsUserDecision?: string
  note?: string
}

export type FormationStage = {
  id: string
  label: string
  durationMonths?: number
  requires?: string[]
  concludesWith?: string
}

export type Rule = {
  id: string
  tradition: string
  title: string
  authority?: string
  /** Most third-order rules do not bind under sin. Surfaced as a rubric. */
  bindingUnderSin: boolean
  minimumAge?: number
  edition: { id: string; label: string; normative: boolean; source?: string }
  formation: FormationStage[]
  items: RuleItem[]
  community?: { id: string; title: string; cadence: Cadence; kind: ItemKind }[]
  profileRequires?: string[]
}

export type Profile = {
  states: StateOfLife[]
  stage: string
  /** Ids of items from non-normative editions the user has explicitly opted into. */
  optedIn: string[]
  /** Hides all counters and history. See docs/PLAN.md §3. */
  scrupulosityMode: boolean
  coords?: { lat: number; lon: number }
  /** The day rolls over here rather than at midnight. Minutes from local midnight. */
  dayStartsAtMin: number
  /**
   * Which printed book each hour is prayed from. Per hour, not per person: it is normal
   * to use a Latin-only breviary for Compline and a Latin/English one for Prime.
   */
  books?: Partial<Record<string, string>>
  /**
   * Per-item reminder times, "HH:MM" local, overriding the item's own anchor.
   * An item with neither an anchor nor an override is never notified about — the app
   * does not invent a time for an obligation whose time the user has not chosen.
   */
  itemTimes?: Record<string, string>
  /** Nightly quiet window, minutes from local midnight. Nothing rings inside it. */
  silence?: { fromMin: number; toMin: number }
  /**
   * The user's own additions, beyond the Rule — a custom prayer routine.
   * Kept on the profile rather than in the Rule file, because the Rule is not theirs
   * to edit and their routine is not the Society's to define.
   */
  personalItems?: RuleItem[]
}

export type CompletionState = 'kept' | 'excused' | 'noted'

export type Completion = {
  itemId: string
  /** ISO yyyy-mm-dd of the liturgical day it belongs to. */
  date: string
  state: CompletionState
  at: number
}
