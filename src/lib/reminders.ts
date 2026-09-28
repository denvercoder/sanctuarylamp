/**
 * When each obligation falls due.
 *
 * This runs on the CLIENT, deliberately. The server's only job is delivery (see
 * supabase/functions/send-due), so the 1962 calendar and the rule engine stay in one
 * tested implementation instead of a second one in Deno that can quietly disagree.
 *
 * Nothing here invents a time. An item with no anchor and no user-set time is simply
 * never notified about — an app that guesses when you ought to pray is worse than one
 * that says nothing.
 */

import { addDays, dayInfo, type DayInfo } from './kalendar'
import { planDay } from './rule/evaluate'
import { resolveAnchor } from './solar'
import type { Completion, Profile, Rule, RuleItem } from './rule/types'

export type Reminder = {
  itemId: string
  title: string
  body?: string
  /** The liturgical day this belongs to, so a late tap marks the right one. */
  day: string
  fireAt: Date
}

/** Minutes from local midnight for a Date, in the viewer's own timezone. */
function localMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * The Great Silence. A window that may wrap past midnight, so 21:30–06:00 is one
 * interval rather than two.
 */
export function inSilence(at: Date, silence: Profile['silence']): boolean {
  if (!silence) return false
  const m = localMinutes(at)
  const { fromMin, toMin } = silence
  return fromMin <= toMin
    ? m >= fromMin && m < toMin
    : m >= fromMin || m < toMin
}

function anchorFor(item: RuleItem, profile: Profile) {
  const override = profile.itemTimes?.[item.id]
  if (override) return { clock: override }
  return item.when
}

/** Reminders for one day. */
export function remindersForDay(
  rule: Rule, info: DayInfo, profile: Profile, history: Completion[] = [],
): Reminder[] {
  const plan = planDay(rule, info, profile, history)
  const candidates = [...plan.obligations, ...plan.counsels, ...plan.penance]

  const out: Reminder[] = []
  for (const planned of candidates) {
    // Already kept or deliberately set aside: do not ring about it.
    if (planned.state) continue

    const anchor = anchorFor(planned.item, profile)
    if (!anchor) continue

    const fireAt = resolveAnchor(anchor, info.date, profile.coords)
    if (!fireAt) continue
    if (inSilence(fireAt, profile.silence)) continue

    out.push({
      itemId: planned.item.id,
      title: planned.item.title,
      body: planned.alternatives.length
        ? planned.alternatives.map((a) => a.title).join(', or ')
        : undefined,
      day: info.iso,
      fireAt,
    })
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
}

/**
 * The next `days` days of reminders, skipping anything already in the past.
 *
 * Called on launch and after any change to the Rule, the profile, or the day's marks.
 * Re-running it is safe: rows are keyed on (user, item, fire_at) and upserted.
 */
export function upcomingReminders(
  rule: Rule, profile: Profile, history: Completion[] = [],
  from: Date = new Date(), days = 3,
): Reminder[] {
  const out: Reminder[] = []
  const startOfToday = new Date(Date.UTC(
    from.getFullYear(), from.getMonth(), from.getDate(),
  ))

  for (let i = 0; i < days; i++) {
    const info = dayInfo(addDays(startOfToday, i))
    // Only today's marks suppress today's reminders; future days are unmarked anyway.
    for (const r of remindersForDay(rule, info, profile, history)) {
      if (r.fireAt.getTime() > from.getTime()) out.push(r)
    }
  }
  return out
}
