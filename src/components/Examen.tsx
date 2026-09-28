import { useMemo, useState } from 'react'
import {
  compare, currentResolution, recentDays, startResolution,
  type ExamenEntry, type Resolution,
} from '../lib/examen'
import type { Profile } from '../lib/rule/types'

/** Exactly the span the method compares: this week against last. */
const SHOWN_DAYS = 14
const DOT = 5
const ROW = 12
const MID = 96

/**
 * The particular examen.
 *
 * One fault, examined at midday and at night, counted. The dots are the traditional
 * record — Ignatius has the penitent draw two rows per day and compare today with
 * yesterday, and this week with last.
 *
 * The counting exists to make a habit visible to someone who has stopped noticing it. It
 * is not a score, and the screen says so rather than leaving the number to speak.
 */
export function Examen({
  profile, resolutions, entries, todayIso, onStart, onRecord, onClose,
}: {
  profile: Profile
  resolutions: Resolution[]
  entries: ExamenEntry[]
  todayIso: string
  onStart: (rs: Resolution[]) => void
  onRecord: (resolutionId: string, date: string,
             patch: Partial<Pick<ExamenEntry, 'midday' | 'night'>>) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')
  const current = currentResolution(resolutions)

  const days = useMemo(() => recentDays(todayIso, SHOWN_DAYS), [todayIso])
  const byDate = useMemo(() => {
    const m = new Map<string, ExamenEntry>()
    for (const e of entries) if (!current || e.resolutionId === current.id) m.set(e.date, e)
    return m
  }, [entries, current])

  const today = current ? byDate.get(todayIso) : undefined
  const comparison = current ? compare(entries, current.id, todayIso) : undefined

  // Asking a scrupulous person to tally their faults twice a day is the most harmful
  // thing this application could do, so it refuses rather than degrading.
  if (profile.scrupulosityMode) {
    return (
      <Frame onClose={onClose}>
        <p className="note" style={{ marginTop: '2rem' }}>
          The particular examen counts faults, and counting faults is precisely what you
          have asked this app not to do. It stays off while scrupulosity mode is on.
        </p>
        <p className="rubric">
          If a confessor or director has asked you to keep it, turn the mode off in
          Settings — but that is their call to make with you, not this app's.
        </p>
      </Frame>
    )
  }

  if (!current) {
    return (
      <Frame onClose={onClose}>
        <p className="rubric" style={{ marginTop: '1rem' }}>
          One fault. Not a list.
        </p>
        <p className="note">
          The particular examen works on a single thing at a time — impatience, harsh
          speech, a habit of complaint — resolved against in the morning, examined at
          midday and at night. Name it in your own words.
        </p>
        <form
          className="signin" style={{ marginTop: '1rem' }}
          onSubmit={(e) => {
            e.preventDefault()
            if (draft.trim()) { onStart(startResolution(resolutions, draft, todayIso)); setDraft('') }
          }}
        >
          <label className="rubric" htmlFor="res">The fault</label>
          <input id="res" value={draft} onChange={(e) => setDraft(e.target.value)}
                 placeholder="impatience at home" autoComplete="off" />
          <button type="submit" className="pill" disabled={!draft.trim()}>Begin</button>
        </form>
        {resolutions.length > 0 && (
          <>
            <hr className="hairline" />
            <h2 className="examen__h2">Before</h2>
            {resolutions.filter((r) => r.endedAt).slice(-6).reverse().map((r) => (
              <p className="note" key={r.id}>
                {r.text} — {r.startedAt} to {r.endedAt}
              </p>
            ))}
          </>
        )}
      </Frame>
    )
  }

  const width = MID * 2 + 24

  return (
    <Frame onClose={onClose}>
      <p className="examen__resolution">{current.text}</p>
      <p className="rubric">Since {current.startedAt}</p>

      <div className="examen__counts">
        <Counter
          label="Midday" value={today?.midday}
          onChange={(v) => onRecord(current.id, todayIso, { midday: v })}
        />
        <Counter
          label="Night" value={today?.night}
          onChange={(v) => onRecord(current.id, todayIso, { night: v })}
        />
      </div>

      <hr className="hairline" />

      <svg viewBox={`0 0 ${width} ${days.length * ROW + 14}`} className="examen__grid"
           role="img" aria-label="This week and last">
        <text x={MID - 8} y={9} className="examen__axis" textAnchor="end">midday</text>
        <text x={MID + 12} y={9} className="examen__axis">night</text>
        <line x1={MID} y1={12} x2={MID} y2={days.length * ROW + 12} className="examen__spine" />
        {days.map((d, i) => {
          const e = byDate.get(d)
          const y = 20 + i * ROW
          const isToday = d === todayIso
          return (
            <g key={d} className={isToday ? 'examen__row examen__row--today' : 'examen__row'}>
              {/* Midday runs leftward from the spine, night rightward. */}
              {Array.from({ length: e?.midday ?? 0 }, (_, k) => (
                <circle key={`m${k}`} cx={MID - 10 - k * (DOT + 3)} cy={y} r={DOT / 2} />
              ))}
              {Array.from({ length: e?.night ?? 0 }, (_, k) => (
                <circle key={`n${k}`} cx={MID + 10 + k * (DOT + 3)} cy={y} r={DOT / 2} />
              ))}
              {e && (e.midday ?? 0) === 0 && e.midday !== undefined && (
                <line x1={MID - 14} y1={y} x2={MID - 8} y2={y} className="examen__none" />
              )}
              {e && (e.night ?? 0) === 0 && e.night !== undefined && (
                <line x1={MID + 8} y1={y} x2={MID + 14} y2={y} className="examen__none" />
              )}
            </g>
          )
        })}
      </svg>

      <dl className="fidelity__stats">
        <div><dt>Today</dt><dd>{fmt(comparison?.today)}</dd></div>
        <div><dt>Yesterday</dt><dd>{fmt(comparison?.yesterday)}</dd></div>
        <div><dt>This week</dt><dd>{fmt(comparison?.thisWeek)}</dd></div>
        <div><dt>Last week</dt><dd>{fmt(comparison?.lastWeek)}</dd></div>
      </dl>

      <p className="rubric">
        A dash is an examination made with nothing to record. A blank row is an
        examination not made. They are different things, and the app will not quietly
        turn the second into the first.
      </p>

      <hr className="hairline" />
      <button type="button" className="pill"
              onClick={() => onStart(resolutions.map((r) =>
                r.id === current.id ? { ...r, endedAt: todayIso } : r))}>
        Finish this resolution
      </button>
      <p className="note">
        Kept locally, never synced. Nobody else can read this, including us.
      </p>
    </Frame>
  )
}

function fmt(v: number | undefined): string {
  return v === undefined ? '—' : String(v)
}

function Counter({
  label, value, onChange,
}: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  const v = value ?? 0
  return (
    <div className="examen__counter">
      <div className="examen__counter-label">{label}</div>
      <div className="examen__counter-row">
        <button type="button" className="pill" aria-label={`${label}: one fewer`}
                onClick={() => onChange(Math.max(0, v - 1))} disabled={v === 0}>−</button>
        <span className="examen__counter-value">{value === undefined ? '—' : v}</span>
        <button type="button" className="pill" aria-label={`${label}: one more`}
                onClick={() => onChange(v + 1)}>+</button>
      </div>
      {value === undefined && (
        <button type="button" className="pill" onClick={() => onChange(0)}>
          None today
        </button>
      )}
    </div>
  )
}

function Frame({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="page">
      <div className="settings__head">
        <h1 className="title" style={{ margin: 0 }}>Particular examen</h1>
        <button type="button" className="pill" onClick={onClose}>Done</button>
      </div>
      {children}
    </div>
  )
}
