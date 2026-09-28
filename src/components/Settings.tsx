import { useState } from 'react'
import { BOOKS, type Hour } from '../lib/books'
import { isIOS, isStandalone, pushState, subscribe, unsubscribe } from '../lib/push'
import { SignIn, SignOut } from './Auth'
import type { Profile, StateOfLife } from '../lib/rule/types'
import type { Session } from '@supabase/supabase-js'
import { rule } from '../rule'
import { requestCoords } from '../lib/geo'
import { saveSubscription } from '../lib/sync'
import { planDay } from '../lib/rule/evaluate'
import { dayInfo, todayLocal } from '../lib/kalendar'

const HOURS: Hour[] = ['lauds', 'prime', 'terce', 'sext', 'none', 'vespers', 'compline', 'matins']

function minToHHMM(min: number | undefined): string {
  if (min === undefined) return ''
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function hhmmToMin(v: string): number {
  const [h, m] = v.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

const STATES: { id: StateOfLife; label: string }[] = [
  { id: 'lay', label: 'Lay' },
  { id: 'priest', label: 'Priest' },
  { id: 'married', label: 'Married' },
  { id: 'single', label: 'Single' },
  { id: 'parent', label: 'Parent' },
]

export function Settings({
  profile, session, onChange, onClose,
}: {
  profile: Profile
  session: Session | null
  onChange: (p: Profile) => void
  onClose: () => void
}) {
  const [push, setPush] = useState(pushState())
  const [pushError, setPushError] = useState<string | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch })

  const toggleState = (s: StateOfLife) => {
    const has = profile.states.includes(s)
    set({ states: has ? profile.states.filter((x) => x !== s) : [...profile.states, s] })
  }

  const enablePush = async () => {
    setPushError(null)
    try {
      const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!key) { setPushError('No VAPID key in this build.'); return }
      const sub = await subscribe(key)
      setPush(pushState())
      if (!sub) { setPushError('Permission was not granted.'); return }
      await saveSubscription(sub)
    } catch (e) {
      setPushError(String(e))
    }
  }

  const optional = rule.items.filter((i) => i.fromEdition)

  /** Everything due today that the user could reasonably want a bell for. */
  const plan = planDay(rule, dayInfo(todayLocal()), profile)
  const remindable = [...plan.obligations, ...plan.counsels, ...plan.penance]

  const setTime = (itemId: string, value: string) => {
    const next = { ...profile.itemTimes }
    if (value) next[itemId] = value
    else delete next[itemId]
    set({ itemTimes: next })
  }

  const askLocation = async () => {
    setGeoBusy(true)
    const r = await requestCoords()
    setGeoBusy(false)
    if (r.ok) set({ coords: r.coords })
    else setGeoError(
      r.reason === 'denied'
        ? 'Location was declined. Sun-timed hours will stay silent; a set time still works.'
        : 'Location is unavailable on this device.',
    )
  }

  return (
    <div className="page">
      <div className="settings__head">
        <h1 className="title" style={{ margin: 0 }}>Settings</h1>
        <button type="button" className="pill" onClick={onClose}>Done</button>
      </div>

      <section>
        <h2>Notifications</h2>
        {push === 'ios-needs-install' ? (
          <>
            <p className="rubric">This is the one that catches everyone.</p>
            <p className="note">
              On iPhone and iPad, notifications only work once the app is on your Home
              Screen. In Safari, tap the <strong>Share</strong> button, choose
              {' '}<strong>Add to Home Screen</strong>, then open Sanctuary Lamp from the
              icon and come back here. Nothing will arrive until you do — Apple gives no
              warning about this, and the app cannot work around it.
            </p>
          </>
        ) : push === 'granted' ? (
          <>
            <p className="note">Notifications are on.</p>
            <button type="button" className="pill"
                    onClick={() => { void unsubscribe().then(() => setPush(pushState())) }}>
              Turn off
            </button>
          </>
        ) : push === 'denied' ? (
          <p className="note">
            Notifications are blocked for this site. Only your browser's own site settings
            can undo that.
          </p>
        ) : push === 'unsupported' ? (
          <p className="note">This browser does not support notifications.</p>
        ) : (
          <>
            <button type="button" className="pill" onClick={() => void enablePush()}>
              Turn on notifications
            </button>
            <p className="note">
              The bell rings for the hours of your Rule and for nothing else. There are no
              reminders to come back, and no notices about anything you have missed.
            </p>
          </>
        )}
        {pushError && <p className="rubric">{pushError}</p>}
        {isIOS() && isStandalone() && <p className="rubric">Installed — good.</p>}
      </section>

      <section>
        <h2>When the bell rings</h2>
        <p className="rubric">
          Nothing rings for an hour you have not given a time. The app does not decide
          when you ought to pray.
        </p>
        {remindable.map((p) => {
          const sun = p.item.when && 'sun' in p.item.when ? p.item.when.sun : undefined
          const value = profile.itemTimes?.[p.item.id] ?? ''
          return (
            <div className="item" key={p.item.id}>
              <span />
              <div>
                <div className="item__title">{p.item.title}</div>
                <div className="item__alts" style={{ alignItems: 'center' }}>
                  <input
                    type="time" className="time" value={value}
                    onChange={(e) => setTime(p.item.id, e.target.value)}
                    aria-label={`Time for ${p.item.title}`}
                  />
                  {sun && !value && (
                    <span className="rubric">
                      {profile.coords ? `at ${sun}` : `at ${sun} — needs your location`}
                    </span>
                  )}
                  {value && (
                    <button type="button" className="pill" onClick={() => setTime(p.item.id, '')}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <h2 style={{ marginTop: '1.5rem' }}>The Great Silence</h2>
        <p className="rubric">Nothing rings inside this window.</p>
        <div className="item__alts" style={{ alignItems: 'center' }}>
          <input type="time" className="time"
                 value={minToHHMM(profile.silence?.fromMin)}
                 onChange={(e) => set({
                   silence: {
                     fromMin: hhmmToMin(e.target.value),
                     toMin: profile.silence?.toMin ?? 6 * 60,
                   },
                 })}
                 aria-label="Silence begins" />
          <span className="rubric">until</span>
          <input type="time" className="time"
                 value={minToHHMM(profile.silence?.toMin)}
                 onChange={(e) => set({
                   silence: {
                     fromMin: profile.silence?.fromMin ?? 21 * 60 + 30,
                     toMin: hhmmToMin(e.target.value),
                   },
                 })}
                 aria-label="Silence ends" />
          {profile.silence && (
            <button type="button" className="pill" onClick={() => set({ silence: undefined })}>
              Clear
            </button>
          )}
        </div>

        <h2 style={{ marginTop: '1.5rem' }}>Location</h2>
        <p className="rubric">
          For the hours tied to the sun. The Angelus is not six, twelve and six — it is a
          bell at dawn, noon and dusk, and those move through the year.
        </p>
        {profile.coords ? (
          <p className="note">
            Set — {profile.coords.lat.toFixed(2)}, {profile.coords.lon.toFixed(2)}.
            {' '}Stored on your device and never sent anywhere but your own account.
          </p>
        ) : (
          <button type="button" className="pill" disabled={geoBusy}
                  onClick={() => void askLocation()}>
            {geoBusy ? 'Asking' : 'Use my location'}
          </button>
        )}
        {geoError && <p className="rubric">{geoError}</p>}
      </section>

      <section>
        <h2>Your books</h2>
        <p className="rubric">
          Per hour, because Compline may come from a different book than Prime.
        </p>
        {(['lauds', 'prime', 'compline'] as Hour[]).map((hour) => (
          <div className="item" key={hour}>
            <span />
            <div>
              <div className="item__title" style={{ textTransform: 'capitalize' }}>{hour}</div>
              <div className="item__alts">
                {BOOKS.map((b) => (
                  <button
                    key={b.id} type="button"
                    className={`pill${profile.books?.[hour] === b.id ? ' pill--on' : ''}`}
                    onClick={() => set({ books: { ...profile.books, [hour]: b.id } })}
                  >
                    {b.shortName}
                  </button>
                ))}
                <button type="button"
                        className={`pill${!profile.books?.[hour] ? ' pill--on' : ''}`}
                        onClick={() => {
                          const next = { ...profile.books }; delete next[hour]
                          set({ books: next })
                        }}>
                  None
                </button>
              </div>
            </div>
          </div>
        ))}
        {HOURS.some((h) => {
          const b = BOOKS.find((x) => x.id === profile.books?.[h])
          return b && !b.confirmed && b.volumes.length > 0
        }) && (
          <p className="rubric">
            Volume splits for the multi-volume sets have not been checked against a
            physical copy, so the app says "unverified" rather than sending you to the
            wrong book.
          </p>
        )}
      </section>

      <section>
        <h2>State of life</h2>
        <p className="rubric">Determines which parts of the Rule bind you.</p>
        <div className="item__alts">
          {STATES.map((s) => (
            <button key={s.id} type="button"
                    className={`pill${profile.states.includes(s.id) ? ' pill--on' : ''}`}
                    onClick={() => toggleState(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {optional.length > 0 && (
        <section>
          <h2>From the other edition</h2>
          <p className="rubric">
            Not in the edition you are professed under. Off unless you choose them.
          </p>
          {optional.map((i) => (
            <div className="item" key={i.id}>
              <span />
              <div>
                <div className="item__title">{i.title}</div>
                <div className="item__alts">
                  <button type="button"
                          className={`pill${profile.optedIn.includes(i.id) ? ' pill--on' : ''}`}
                          onClick={() => set({
                            optedIn: profile.optedIn.includes(i.id)
                              ? profile.optedIn.filter((x) => x !== i.id)
                              : [...profile.optedIn, i.id],
                          })}>
                    {profile.optedIn.includes(i.id) ? 'Kept' : 'Keep this'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Scrupulosity</h2>
        <button type="button"
                className={`pill${profile.scrupulosityMode ? ' pill--on' : ''}`}
                onClick={() => set({ scrupulosityMode: !profile.scrupulosityMode })}>
          {profile.scrupulosityMode ? 'On' : 'Off'}
        </button>
        <p className="note">
          Hides every counter and record. The lamp burns at a constant brightness and tells
          you nothing. Nothing is kept that you could read back over.
        </p>
      </section>

      <section>
        <h2>Account</h2>
        {session
          ? <><p className="note">Signed in as {session.user.email}.</p><SignOut /></>
          : <SignIn />}
      </section>

      <hr className="hairline" />
      <p className="footer rubric">
        The Rule does not bind under sin.
      </p>
    </div>
  )
}
