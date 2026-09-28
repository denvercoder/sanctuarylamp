import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { dayInfo, todayLocal } from './lib/kalendar'
import { lumen as computeLumen, planDay } from './lib/rule/evaluate'
import type { Completion, CompletionState, Profile } from './lib/rule/types'
import {
  DEFAULT_PROFILE, loadExamen, loadHistory, loadProfile, loadResolutions, mark,
  recordExamen, saveProfile, saveResolutions,
} from './db'
import { rule } from './rule'
import { upcomingReminders } from './lib/reminders'
import {
  drainPendingMarks, publishReminders, pullProfile, pushProfile, syncCompletions,
} from './lib/sync'
import { Today } from './components/Today'
import { Recollection } from './components/Recollection'




import type { ExamenEntry, Resolution } from './lib/examen'
import { useSession } from './components/Auth'

/**
 * The secondary screens load on demand. Opening the app to check off a Rosary should not
 * wait on the code for a monthly report, and on a five-year-old phone that difference is
 * the one the user actually feels.
 */
const Settings = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })))
const Fidelity = lazy(() => import('./components/Fidelity').then((m) => ({ default: m.Fidelity })))
const Examen = lazy(() => import('./components/Examen').then((m) => ({ default: m.Examen })))
const Report = lazy(() => import('./components/Report').then((m) => ({ default: m.Report })))

const COLOUR_VAR: Record<string, string> = {
  white: 'var(--lit-white)', red: 'var(--lit-red)', green: 'var(--lit-green)',
  violet: 'var(--lit-violet)', black: 'var(--lit-black)', rose: 'var(--lit-rose)',
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [history, setHistory] = useState<Completion[]>([])
  const [ready, setReady] = useState(false)
  const [recollecting, setRecollecting] = useState<string | null | false>(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [fidelityOpen, setFidelityOpen] = useState(false)
  const [examenOpen, setExamenOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [examenEntries, setExamenEntries] = useState<ExamenEntry[]>([])
  const { session } = useSession()

  useEffect(() => {
    void (async () => {
      // Marks made from a notification while the app was closed land first, so the day's
      // record is complete before it is shown.
      await drainPendingMarks()
      const [p, h, rs, ex] = await Promise.all([
        loadProfile(), loadHistory(), loadResolutions(), loadExamen(),
      ])
      setProfile(p); setHistory(h); setResolutions(rs); setExamenEntries(ex)
      setReady(true)
    })()
  }, [])

  /** On sign-in: pull the profile, reconcile completions, then republish the queue. */
  useEffect(() => {
    if (!session) return
    void (async () => {
      const remote = await pullProfile()
      if (remote) { setProfile(remote); await saveProfile(remote) }
      await syncCompletions()
      setHistory(await loadHistory())
    })()
  }, [session])

  /**
   * Republish the reminder queue whenever anything that affects it changes. Idempotent
   * by construction — the future unsent rows are deleted and rewritten — so running it
   * more often than strictly necessary costs nothing and getting it wrong is loud.
   */
  useEffect(() => {
    if (!ready || !session) return
    const t = window.setTimeout(() => {
      void publishReminders(upcomingReminders(rule, profile, history))
    }, 800)
    return () => window.clearTimeout(t)
  }, [ready, session, profile, history])

  /**
   * The liturgical day. It turns over at the profile's `dayStartsAtMin` rather than at
   * midnight, so someone praying Compline at 11:40pm is not handed a new day mid-prayer.
   */
  const info = useMemo(() => {
    const now = new Date()
    const minsSinceMidnight = now.getHours() * 60 + now.getMinutes()
    const d = todayLocal(now)
    if (minsSinceMidnight < profile.dayStartsAtMin) {
      return dayInfo(new Date(d.getTime() - 86_400_000))
    }
    return dayInfo(d)
  }, [profile.dayStartsAtMin])

  const plan = useMemo(
    () => planDay(rule, info, profile, history), [info, profile, history],
  )
  const lumen = computeLumen(plan, profile)

  // Liturgical colour reaches the page through exactly one property.
  useEffect(() => {
    document.documentElement.style.setProperty('--today-colour', COLOUR_VAR[info.colour]!)
    document.documentElement.style.setProperty('--lumen', String(lumen))
    document.body.dataset.triduum = String(info.lampExtinguished)
  }, [info.colour, info.lampExtinguished, lumen])

  const onMark = useCallback(async (itemId: string, state: CompletionState | null) => {
    await mark(itemId, info.iso, state)
    setHistory(await loadHistory())
    void syncCompletions()
  }, [info.iso])

  const onProfileChange = useCallback(async (next: Profile) => {
    setProfile(next)
    await saveProfile(next)
    void pushProfile(next)
  }, [])

  /**
   * A tap on "Prayed" in a notification reaches us here, so the obligation is checked off
   * without the app ever being opened. The worker passes the day the reminder belonged
   * to, so a late tap marks the right day rather than today.
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; itemId?: string; date?: string; state?: CompletionState }
      if (d?.type !== 'mark' || !d.itemId) return
      void mark(d.itemId, d.date ?? info.iso, d.state ?? 'kept')
        .then(loadHistory).then(setHistory)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [info.iso])

  const recollectItem = useMemo(() => {
    if (!recollecting) return null
    return rule.items.find((i) => i.id === recollecting) ?? null
  }, [recollecting])

  if (!ready) return null

  if (reportOpen) {
    return (
      <Suspense fallback={<div className="page" />}><Report
        rule={rule} profile={profile} history={history}
        resolutions={resolutions} examen={examenEntries}
        onClose={() => setReportOpen(false)}
      /></Suspense>
    )
  }

  if (examenOpen) {
    return (
      <Suspense fallback={<div className="page" />}><Examen
        profile={profile} resolutions={resolutions} entries={examenEntries}
        todayIso={info.iso}
        onStart={(rs) => { setResolutions(rs); void saveResolutions(rs) }}
        onRecord={(resolutionId, date, patch) => {
          void recordExamen(resolutionId, date, patch).then(loadExamen).then(setExamenEntries)
        }}
        onClose={() => setExamenOpen(false)}
      /></Suspense>
    )
  }

  if (fidelityOpen) {
    return (
      <Suspense fallback={<div className="page" />}><Fidelity
        rule={rule} profile={profile} history={history}
        onClose={() => setFidelityOpen(false)}
      /></Suspense>
    )
  }

  if (settingsOpen) {
    return (
      <Suspense fallback={<div className="page" />}><Settings
        profile={profile} session={session}
        onChange={(p) => void onProfileChange(p)}
        onClose={() => setSettingsOpen(false)}
      /></Suspense>
    )
  }

  return (
    <>
      <div className="topbar">
        <button type="button" onClick={() => setExamenOpen(true)}>Examen</button>
        <button type="button" onClick={() => setReportOpen(true)}>Report</button>
        <button type="button" onClick={() => setFidelityOpen(true)}>Fidelity</button>
        <button type="button" onClick={() => setSettingsOpen(true)}>Settings</button>
      </div>
      <Today
        rule={rule} plan={plan} profile={profile} lumen={lumen}
        onMark={onMark}
        onEnter={(id) => setRecollecting(id)}
        onOpenLamp={() => setRecollecting(null)}
      />
      {recollecting !== false && (
        <Recollection
          item={recollectItem}
          info={info}
          lumen={lumen}
          extinguished={info.lampExtinguished}
          onDone={() => {
            if (recollectItem) void onMark(recollectItem.id, 'kept')
            setRecollecting(false)
          }}
          onExit={() => setRecollecting(false)}
        />
      )}
    </>
  )
}
