import { useMemo, useState } from 'react'
import { dayInfo, parseISO, todayLocal, type Colour } from '../lib/kalendar'
import { fidelityRange, liturgicalYearBounds, summarise, type DayFidelity } from '../lib/fidelity'
import type { Completion, Profile, Rule } from '../lib/rule/types'

const COLOUR_HEX: Record<Colour, string> = {
  white: '#F2EAD8', red: '#8E2B20', green: '#3F5E4A',
  violet: '#4B2E5A', black: '#14110F', rose: '#C98B9B', gold: '#B08D57',
} as Record<Colour, string>

/**
 * How much of the day's colour a cell shows.
 *
 * There is a floor, for the same reason the lamp has one: the liturgical year happened
 * whether or not you kept it, and a grid that is blank until you earn it would be both a
 * lie and a scold. Silence is dim, never red, never empty — your fidelity brightens the
 * window, it does not create it.
 */
const ALPHA: Record<DayFidelity['state'], number> = {
  empty: 0.22, none: 0.34, some: 0.68, all: 1,
}
/** Days not yet come, shown faintly so the shape of the year ahead is visible. */
const FUTURE_ALPHA = 0.16

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CELL = 11
const GAP = 3
const TOP = 16

/**
 * The year, one cell per day, tinted by the liturgical colour of the day.
 *
 * Over twelve months this reads as a stained-glass window: long greens either side of a
 * violet Lent, white at Christmas and Easter, a single rose cell on Gaudete and Laetare.
 * It is a picture of the year rather than a score, which is the whole point — see
 * docs/PLAN.md §3.
 */
export function Fidelity({
  rule, profile, history, onClose,
}: {
  rule: Rule
  profile: Profile
  history: Completion[]
  onClose: () => void
}) {
  const [hovered, setHovered] = useState<DayFidelity | null>(null)

  const { summary, columns, cells } = useMemo(() => {
    const { from, to } = liturgicalYearBounds(todayLocal())
    const days = fidelityRange(rule, profile, history, from, to)
    // Pad so the first column starts on a Sunday and every row is one weekday.
    const pad = Array.from({ length: from.getUTCDay() }, () => null)
    const cells: (DayFidelity | null)[] = [...pad, ...days]
    return { summary: summarise(days), columns: Math.ceil(cells.length / 7), cells }
  }, [rule, profile, history])

  const width = columns * (CELL + GAP)
  const height = TOP + 7 * (CELL + GAP)
  const todayIso = dayInfo(todayLocal()).iso

  // Month labels at the column where each month first appears.
  const monthMarks = useMemo(() => {
    const marks: { x: number; label: string }[] = []
    let lastMonth = -1
    cells.forEach((c, i) => {
      if (!c) return
      const m = Number(c.iso.slice(5, 7)) - 1
      if (m !== lastMonth) {
        lastMonth = m
        marks.push({ x: Math.floor(i / 7) * (CELL + GAP), label: MONTHS[m]! })
      }
    })
    return marks
  }, [cells])

  if (profile.scrupulosityMode) {
    return (
      <div className="page">
        <div className="settings__head">
          <h1 className="title" style={{ margin: 0 }}>Fidelity</h1>
          <button type="button" className="pill" onClick={onClose}>Done</button>
        </div>
        <p className="note" style={{ marginTop: '2rem' }}>
          Hidden, because you have asked for it to be. There is nothing here to read back
          over and nothing being counted.
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="settings__head">
        <h1 className="title" style={{ margin: 0 }}>Fidelity</h1>
        <button type="button" className="pill" onClick={onClose}>Done</button>
      </div>

      <p className="rubric" style={{ marginTop: '1rem' }}>
        The liturgical year, a cell for each day, in the colour of that day. Violet
        through Lent, white at Easter and Christmas, one rose cell on Gaudete and another
        on Laetare, black through the Triduum. Keeping the Rule brightens it.
      </p>

      <div className="fidelity__scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="fidelity__grid"
          style={{ minWidth: width }}
          role="img"
          aria-label="Fidelity through the liturgical year"
        >
          {monthMarks.map((m) => (
            <text key={`${m.label}-${m.x}`} x={m.x} y={10} className="fidelity__month">
              {m.label}
            </text>
          ))}
          {cells.map((c, i) => {
            if (!c) return null
            const col = Math.floor(i / 7)
            const row = i % 7
            const x = col * (CELL + GAP)
            const y = TOP + row * (CELL + GAP)
            const future = c.iso > todayIso
            return (
              <rect
                key={c.iso}
                x={x} y={y} width={CELL} height={CELL} rx={2}
                fill={c.lampExtinguished ? '#000' : COLOUR_HEX[c.colour]}
                fillOpacity={future ? FUTURE_ALPHA : ALPHA[c.state]}
                stroke={c.iso === todayIso ? 'var(--brass)' : 'none'}
                strokeWidth={c.iso === todayIso ? 1.4 : 0}
                onMouseEnter={() => setHovered(c)}
                onFocus={() => setHovered(c)}
                onClick={() => setHovered(c)}
                tabIndex={-1}
              >
                <title>{describe(c)}</title>
              </rect>
            )
          })}
        </svg>
      </div>

      <p className="note fidelity__caption">
        {hovered ? describe(hovered) : 'Touch a day to see what it held.'}
      </p>

      <hr className="hairline" />

      <dl className="fidelity__stats">
        <div><dt>Kept in full</dt><dd>{summary.full}</dd></div>
        <div><dt>In part</dt><dd>{summary.partial}</dd></div>
        <div><dt>Silent</dt><dd>{summary.silent}</dd></div>
        <div className="fidelity__returns">
          <dt>Returns</dt><dd>{summary.returns}</dd>
        </div>
      </dl>

      <p className="rubric">
        A return is a day with something after a day with nothing. It is the only number
        here that can be said to be going somewhere, and it can only ever go up. There is
        no streak to break, and nothing to lose by having been away.
      </p>
    </div>
  )
}

function describe(d: DayFidelity): string {
  const when = new Date(parseISO(d.iso)).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })
  if (d.lampExtinguished) return `${when} — the lamp is out.`
  if (d.state === 'empty') return `${when} — nothing was due.`
  if (d.state === 'none') return `${when} — nothing recorded.`
  const bits = [`${d.kept} kept`]
  if (d.excused) bits.push(`${d.excused} excused`)
  if (d.noted) bits.push(`${d.noted} noted`)
  return `${when} — ${bits.join(', ')} of ${d.due}.`
}
