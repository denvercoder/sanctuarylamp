import { useCallback, useEffect, useMemo, useState } from 'react'
import { dayInfo, todayLocal } from './lib/kalendar'
import { lumen as computeLumen, planDay } from './lib/rule/evaluate'
import type { Completion, CompletionState, Profile } from './lib/rule/types'
import { DEFAULT_PROFILE, loadHistory, loadProfile, mark, saveProfile } from './db'
import { rule } from './rule'
import { Today } from './components/Today'
import { Recollection } from './components/Recollection'
import { Settings } from './components/Settings'
import { useSession } from './components/Auth'

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
  const { session } = useSession()

  useEffect(() => {
    void (async () => {
      const [p, h] = await Promise.all([loadProfile(), loadHistory()])
      setProfile(p); setHistory(h); setReady(true)
    })()
  }, [])

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
  }, [info.iso])

  const onProfileChange = useCallback(async (next: Profile) => {
    setProfile(next)
    await saveProfile(next)
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

  if (settingsOpen) {
    return (
      <Settings
        profile={profile} session={session}
        onChange={(p) => void onProfileChange(p)}
        onClose={() => setSettingsOpen(false)}
      />
    )
  }

  return (
    <>
      <div className="topbar">
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
