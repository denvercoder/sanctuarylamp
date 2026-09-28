import { ordoLine } from '../lib/kalendar'
import { bookForHour, guide, type Hour } from '../lib/books'
import { Lamp } from './Lamp'
import { Wick } from './Wick'
import type { DayPlan, PlannedItem } from '../lib/rule/evaluate'
import type { CompletionState, Profile, Rule } from '../lib/rule/types'

function Item({
  planned, onMark, onEnter, hideMeta, bookNote,
}: {
  planned: PlannedItem
  onMark: (id: string, state: CompletionState | null) => void
  onEnter: (id: string) => void
  hideMeta: boolean
  bookNote?: string
}) {
  const { item, state, alternatives, due } = planned
  const cycle = () => onMark(item.id, state === 'kept' ? null : 'kept')

  return (
    <div className={`item${state === 'kept' ? ' item--kept' : ''}`}>
      <Wick state={state} onClick={cycle} label={item.title} />
      <div>
        <button
          type="button" className="hero__lamp item__title"
          style={{ textAlign: 'left', color: 'inherit', font: 'inherit' }}
          onClick={() => onEnter(item.id)}
        >
          {item.title}
        </button>
        {planned.replaces && (
          <div className="rubric">
            Here {planned.replaces.title} is replaced by {item.title}.
          </div>
        )}
        {item.durationMin && <div className="rubric">{item.durationMin} minutes</div>}
        {bookNote && <div className="rubric">{bookNote}</div>}
        {alternatives.length > 0 && (
          <div className="rubric">
            Discharged by either: {alternatives.map((a) => a.title).join(', or ')}
          </div>
        )}
        {due.kind === 'periodic' && !hideMeta && (
          <div className="note">
            {due.lastKept
              ? <>Last kept {due.lastKept}{due.dueBy && <> · due by {due.dueBy}</>}
                  {due.overdue && <span className="rubric"> — past the Rule's minimum</span>}
                  {!due.overdue && due.aimMissed && <span className="rubric"> — past the aim, within the minimum</span>}
                </>
              : <>No record yet.</>}
          </div>
        )}
        {state !== 'kept' && (
          <div className="item__alts">
            <button type="button"
              className={`pill${state === 'excused' ? ' pill--on' : ''}`}
              onClick={() => onMark(item.id, state === 'excused' ? null : 'excused')}>
              Excused
            </button>
            <button type="button"
              className={`pill${state === 'noted' ? ' pill--on' : ''}`}
              onClick={() => onMark(item.id, state === 'noted' ? null : 'noted')}>
              Note it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function Today({
  rule, plan, profile, lumen, onMark, onEnter, onOpenLamp,
}: {
  rule: Rule
  plan: DayPlan
  profile: Profile
  lumen: number
  onMark: (id: string, state: CompletionState | null) => void
  onEnter: (id: string) => void
  onOpenLamp: () => void
}) {
  const { info } = plan
  const ordo = ordoLine(info)

  const hideMeta = profile.scrupulosityMode

  /**
   * For an office, name the book and volume it is prayed from today, and say so if the
   * user's own edition does not contain it. Per hour, because Compline may come from a
   * different book than Prime.
   */
  const HOURS: Hour[] =
    ['matins', 'lauds', 'prime', 'terce', 'sext', 'none', 'vespers', 'compline']

  const noteFor = (planned: PlannedItem): string | undefined => {
    const prayerId = planned.item.prayerId
      ?? planned.alternatives.find((a) => a.prayerId)?.prayerId
    const hour = HOURS.find((h) => h === prayerId)
    if (!hour) return undefined
    const book = bookForHour(profile.books, hour)
    if (!book) return undefined
    const g = guide(book, info, hour)
    if (g.present === false) return `Not in ${g.book.name} for today.`
    const where = g.volume ? `${g.book.publisher} · ${g.volume.label}` : g.book.publisher
    return g.caveat ? `${where} — unverified` : where
  }

  return (
    <>
      <div className="ribbon" aria-hidden="true" />
      <div className="page">
        <div className="hero">
          <button type="button" className="hero__lamp" onClick={onOpenLamp}
                  aria-label="Enter recollection">
            <Lamp lumen={lumen} size={228} extinguished={info.lampExtinguished} />
          </button>
        </div>

        {/* The ordo line. The breviary cannot tell you which of its parts to pray
            today, or which colour it is; this can. See docs/PLAN.md §8. */}
        <div className="daybar">
          <span className="chip" aria-hidden="true" />
          <span className="daybar__name">{ordo.day}</span>
          <span className="daybar__season">{ordo.season}</span>
          <span className="daybar__colour">{ordo.colour}</span>
        </div>
        <h1 className="title" style={{ marginTop: '0.75rem' }}>
          {info.lampExtinguished ? 'The tabernacle is empty' : 'Enter recollection'}
        </h1>

        {plan.obligations.length > 0 && (
          <section>
            <h2>Today</h2>
            {plan.obligations.map((p) => (
              <Item key={p.item.id} planned={p} onMark={onMark} onEnter={onEnter} hideMeta={hideMeta}
                bookNote={noteFor(p)} />
            ))}
          </section>
        )}

        {plan.counsels.length > 0 && (
          <section>
            <h2>Of your own</h2>
            <p className="rubric">Beyond what the Rule asks. Yours to change.</p>
            {plan.counsels.map((p) => (
              <Item key={p.item.id} planned={p} onMark={onMark} onEnter={onEnter}
                    hideMeta={hideMeta} bookNote={noteFor(p)} />
            ))}
          </section>
        )}

        {plan.penance.length > 0 && (
          <section>
            <h2>Penance</h2>
            <p className="rubric">Bound today by the calendar, not by choice.</p>
            {plan.penance.map((p) => (
              <Item key={p.item.id} planned={p} onMark={onMark} onEnter={onEnter} hideMeta={hideMeta}
                bookNote={noteFor(p)} />
            ))}
          </section>
        )}

        {plan.periodic.length > 0 && (
          <section>
            <h2>In its season</h2>
            {plan.periodic.map((p) => (
              <Item key={p.item.id} planned={p} onMark={onMark} onEnter={onEnter} hideMeta={hideMeta}
                bookNote={noteFor(p)} />
            ))}
          </section>
        )}

        {plan.dispositions.length > 0 && (
          <section>
            <h2>Standing</h2>
            <p className="rubric">Dispositions of the Rule. Not tasks; never checked off.</p>
            {plan.dispositions.map((p) => (
              <div className="item" key={p.item.id}>
                <span />
                <div>
                  <div className="item__title">{p.item.title}</div>
                  {p.item.note && <div className="note">{p.item.note}</div>}
                </div>
              </div>
            ))}
          </section>
        )}

        <hr className="hairline" />
        <p className="footer">
          {rule.title}
          <br />
          <span className="rubric">
            {rule.authority}
            {rule.bindingUnderSin === false && ' · The Rule does not bind under sin.'}
          </span>
        </p>
      </div>
    </>
  )
}
