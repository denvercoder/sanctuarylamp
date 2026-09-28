/**
 * The particular examen.
 *
 * The traditional method: choose ONE fault, resolve against it in the morning, examine at
 * midday and again at night, and count the falls. The counting is not scoring — it exists
 * to make a habit visible to someone who has stopped noticing it. Ignatius has the
 * penitent draw literal dots in two rows per day and compare today with yesterday, and
 * this week with last.
 *
 * Two deliberate constraints:
 *
 *  - **One resolution at a time.** A list of faults to work on is a list nobody works on.
 *    Starting a new resolution ends the previous one.
 *  - **Never in scrupulosity mode.** Asking a scrupulous person to tally their faults
 *    twice a day is the single most harmful thing this application could do. The UI
 *    refuses rather than degrading.
 */

export type Resolution = {
  id: string
  text: string
  /** ISO day. */
  startedAt: string
  endedAt?: string
}

export type ExamenEntry = {
  /** ISO day. */
  date: string
  resolutionId: string
  /** Falls counted at the midday examination. */
  midday?: number
  /** Falls counted at the night examination. */
  night?: number
  note?: string
}

export function currentResolution(resolutions: Resolution[]): Resolution | undefined {
  return resolutions.filter((r) => !r.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
}

export function totalFor(entry: ExamenEntry | undefined): number | undefined {
  if (!entry) return undefined
  if (entry.midday === undefined && entry.night === undefined) return undefined
  return (entry.midday ?? 0) + (entry.night ?? 0)
}

const DAY = 86_400_000

function isoDaysBack(from: string, n: number): string {
  return new Date(Date.parse(from) - n * DAY).toISOString().slice(0, 10)
}

/** The last `n` days ending at `endIso`, oldest first. */
export function recentDays(endIso: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => isoDaysBack(endIso, n - 1 - i))
}

export type Comparison = {
  today?: number
  yesterday?: number
  thisWeek?: number
  lastWeek?: number
}

/**
 * The two comparisons the method actually asks for. Returns undefined rather than zero
 * where there is no record, because "no entry" and "no falls" are different facts and
 * conflating them would quietly flatter the user.
 */
export function compare(
  entries: ExamenEntry[], resolutionId: string, todayIso: string,
): Comparison {
  const mine = new Map(
    entries.filter((e) => e.resolutionId === resolutionId).map((e) => [e.date, e]),
  )
  const sum = (days: string[]): number | undefined => {
    const present = days.map((d) => totalFor(mine.get(d))).filter((v): v is number => v !== undefined)
    return present.length ? present.reduce((a, b) => a + b, 0) : undefined
  }

  return {
    today: totalFor(mine.get(todayIso)),
    yesterday: totalFor(mine.get(isoDaysBack(todayIso, 1))),
    thisWeek: sum(recentDays(todayIso, 7)),
    lastWeek: sum(recentDays(isoDaysBack(todayIso, 7), 7)),
  }
}

export function newResolution(text: string, todayIso: string): Resolution {
  return {
    id: `res-${Date.now().toString(36)}`,
    text: text.trim(),
    startedAt: todayIso,
  }
}

/** Starting a resolution ends whichever one was running. */
export function startResolution(
  resolutions: Resolution[], text: string, todayIso: string,
): Resolution[] {
  const ended = resolutions.map((r) => (r.endedAt ? r : { ...r, endedAt: todayIso }))
  return [...ended, newResolution(text, todayIso)]
}
