import { useEffect, useRef, useState } from 'react'
import { Lamp } from './Lamp'
import { LampGreat } from './LampGreat'
import { useMediaQuery } from '../lib/useMediaQuery'
import type { RuleItem } from '../lib/rule/types'
import type { DayInfo } from '../lib/kalendar'
import { ordoLine } from '../lib/kalendar'

/**
 * Recollection — the stripped, full-screen prayer mode.
 *
 * The Catholic word is exact: recollection is the gathering of the soul inward and the
 * shedding of distraction. Explicitly not "Zen mode".
 *
 * Rules, from docs/LAMP.md:
 *  - no visible controls until a tap; they fade again after three seconds
 *  - no countdown, ever. The flame grows over the interval instead.
 *  - the screen does not sleep
 *  - leaving early records nothing and says nothing
 */
export function Recollection({
  item, info, lumen, extinguished, onDone, onExit,
}: {
  item: RuleItem | null
  info: DayInfo
  lumen: number
  extinguished: boolean
  onDone: () => void
  onExit: () => void
}) {
  /**
   * On a large screen the compact lamp floats in the middle of an enormous dark room
   * doing nothing, so Recollection swaps in a different, far more detailed object.
   * Phones and tablets keep the compact one, where the extra detail would only blur
   * and the animation cost buys nothing.
   */
  const great = useMediaQuery('(min-width: 900px) and (min-height: 620px)')
  const [controlsShown, setControlsShown] = useState(true)
  const hideTimer = useRef<number | undefined>(undefined)
  const [grown, setGrown] = useState(0)

  // Reveal on tap, hide after three seconds.
  useEffect(() => {
    if (!controlsShown) return
    hideTimer.current = window.setTimeout(() => setControlsShown(false), 3000)
    return () => window.clearTimeout(hideTimer.current)
  }, [controlsShown])

  // The screen must not sleep during the third decade.
  useEffect(() => {
    let sentinel: WakeLockSentinel | undefined
    let released = false
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock
    wakeLock?.request('screen').then((s) => {
      if (released) { void s.release(); return }
      sentinel = s
    }).catch(() => { /* unsupported or denied; not worth telling the user about */ })
    return () => { released = true; void sentinel?.release().catch(() => {}) }
  }, [])

  // A timed item's flame grows across its interval. No numbers are shown.
  const durationMin = item?.durationMin
  useEffect(() => {
    if (!durationMin) return
    const started = Date.now()
    const total = durationMin * 60_000
    const tick = window.setInterval(() => {
      setGrown(Math.min(1, (Date.now() - started) / total))
    }, 2000)
    return () => window.clearInterval(tick)
  }, [durationMin])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  const shown = durationMin ? Math.max(lumen, 0.25 + 0.75 * grown) : Math.max(lumen, 0.55)

  // The room's light is CSS, so the brightness has to reach it as a custom property.
  useEffect(() => {
    document.documentElement.style.setProperty('--lumen', String(extinguished ? 0 : shown))
  }, [shown, extinguished])

  return (
    <div
      className={`recollection${great ? ' recollection--great' : ''}`}
      onClick={() => setControlsShown(true)}
      role="dialog"
      aria-label="Recollection"
    >
      <div className="recollection__inner">
        {great
          ? <LampGreat lumen={shown} extinguished={extinguished} />
          : <Lamp lumen={shown} size={200} extinguished={extinguished} />}
        {item && <p className="recollection__title">{item.title}</p>}
        {/* No prayer text. The office is prayed from the user's own breviary — what
            software is good for is saying WHICH office. See docs/PLAN.md §8. */}
        {item?.prayerId === 'prime' || item?.prayerId === 'compline' ? (
          <p className="recollection__ordo">
            {ordoLine(info).day} · {ordoLine(info).season} · {ordoLine(info).colour}
          </p>
        ) : item?.text ? (
          <p className="recollection__text">{item.text}</p>
        ) : null}
      </div>

      <div className={`recollection__controls${controlsShown ? ' recollection__controls--shown' : ''}`}>
        {item && (
          <button
            type="button" className="recollection__btn"
            onClick={(e) => { e.stopPropagation(); onDone() }}
          >
            Done
          </button>
        )}
        <button
          type="button" className="recollection__btn"
          onClick={(e) => { e.stopPropagation(); onExit() }}
        >
          Exit
        </button>
      </div>
    </div>
  )
}
