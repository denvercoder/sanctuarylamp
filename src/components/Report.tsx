import { useMemo, useState } from 'react'
import { itemSummaries, monthBounds, fidelityRange, summarise } from '../lib/fidelity'
import { compare, currentResolution, type ExamenEntry, type Resolution } from '../lib/examen'
import type { Completion, Profile, Rule } from '../lib/rule/types'

/**
 * The monthly recollection — a page to bring to a confessor or director.
 *
 * This is the end of the loop in docs/PLAN.md §6: mental prayer gives a resolution, the
 * particular examen records it, and this gathers a month of both into something you can
 * hold. It is built to be PRINTED. Paper is what actually gets carried into a parlour,
 * and it is also the honest backup — if this project disappears, the user keeps the page.
 *
 * It reports counts and the Rule's own questions. It computes no score and offers no
 * judgement: reading the record is the director's work, not the application's.
 */
export function Report({
  rule, profile, history, resolutions, examen, onClose,
}: {
  rule: Rule
  profile: Profile
  history: Completion[]
  resolutions: Resolution[]
  examen: ExamenEntry[]
  onClose: () => void
}) {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(thisMonth)

  const { items, days, resolution, comparison, label } = useMemo(() => {
    const { from, to } = monthBounds(month)
    const items = itemSummaries(rule, profile, history, from, to)
    const days = summarise(fidelityRange(rule, profile, history, from, to))
    const resolution = currentResolution(resolutions)
      ?? resolutions.filter((r) => r.endedAt).at(-1)
    const comparison = resolution
      ? compare(examen, resolution.id, to.toISOString().slice(0, 10))
      : undefined
    const label = from.toLocaleDateString(undefined, {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    })
    return { items, days, resolution, comparison, label }
  }, [rule, profile, history, resolutions, examen, month])

  const monthFalls = useMemo(() => {
    if (!resolution) return undefined
    const { from, to } = monthBounds(month)
    const f = from.toISOString().slice(0, 10)
    const t = to.toISOString().slice(0, 10)
    const mine = examen.filter((e) =>
      e.resolutionId === resolution.id && e.date >= f && e.date <= t)
    if (!mine.length) return undefined
    return {
      examined: mine.length,
      falls: mine.reduce((n, e) => n + (e.midday ?? 0) + (e.night ?? 0), 0),
    }
  }, [examen, resolution, month])

  const months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  }, [now.getFullYear(), now.getMonth()])

  return (
    <div className="page report">
      <div className="settings__head no-print">
        <h1 className="title" style={{ margin: 0 }}>Monthly recollection</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="pill" onClick={() => window.print()}>Print</button>
          <button type="button" className="pill" onClick={onClose}>Done</button>
        </div>
      </div>

      <div className="item__alts no-print" style={{ margin: '1rem 0' }}>
        {months.map((m) => (
          <button key={m} type="button"
                  className={`pill${m === month ? ' pill--on' : ''}`}
                  onClick={() => setMonth(m)}>
            {m}
          </button>
        ))}
      </div>

      <header className="report__head">
        <h2 className="report__title">{label}</h2>
        <p className="report__sub">{rule.title}</p>
      </header>

      <section>
        <h3 className="report__h3">The days</h3>
        <p className="report__line">
          {days.full} kept in full · {days.partial} in part · {days.silent} with nothing
          recorded · {days.returns} {days.returns === 1 ? 'return' : 'returns'}
        </p>
      </section>

      <section>
        <h3 className="report__h3">The Rule, item by item</h3>
        <table className="report__table">
          <thead>
            <tr><th>Obligation</th><th>Due</th><th>Kept</th><th>Excused</th><th>Noted</th></tr>
          </thead>
          <tbody>
            {items.filter((i) => i.due > 0).map((i) => (
              <tr key={i.itemId}>
                <td>
                  {i.title}
                  {i.examenQuestion && (
                    <span className="report__question">{i.examenQuestion}</span>
                  )}
                </td>
                <td>{i.due}</td>
                <td>{i.kept}</td>
                <td>{i.excused || ''}</td>
                <td>{i.noted || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {resolution && !profile.scrupulosityMode && (
        <section>
          <h3 className="report__h3">Particular examen</h3>
          <p className="report__line"><strong>{resolution.text}</strong> — since {resolution.startedAt}
            {resolution.endedAt && `, ended ${resolution.endedAt}`}</p>
          {monthFalls ? (
            <p className="report__line">
              Examined on {monthFalls.examined}{' '}
              {monthFalls.examined === 1 ? 'day' : 'days'}; {monthFalls.falls}{' '}
              {monthFalls.falls === 1 ? 'fall' : 'falls'} recorded.
              {comparison?.thisWeek !== undefined && comparison.lastWeek !== undefined && (
                <> Last week {comparison.lastWeek}, the week before {comparison.thisWeek}.</>
              )}
            </p>
          ) : (
            <p className="report__line">No examinations recorded this month.</p>
          )}
        </section>
      )}

      <section className="report__notes">
        <h3 className="report__h3">Notes</h3>
        <div className="report__rules" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => <span key={i} />)}
        </div>
      </section>

      <p className="rubric no-print">
        Written for paper. Print it and bring it — a page in a parlour is worth more than
        a screen, and if this project ever disappears you still have the record.
      </p>
    </div>
  )
}
