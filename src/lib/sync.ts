/**
 * Sync — additive, never load-bearing.
 *
 * IndexedDB is the source of truth on the device (docs/PLAN.md §12). Everything here is
 * best-effort: a failure logs and returns, and the app carries on exactly as it would
 * with no account at all. Nothing in the UI waits on any of it.
 */

import { getSupabase } from './supabase'
import { db, loadHistory } from '../db'
import type { Completion, Profile } from './rule/types'
import type { Reminder } from './reminders'

const PENDING_CACHE = 'pending-marks'

type Row = { item_id: string; day: string; state: Completion['state']; at: string }

/**
 * Marks made from a notification while no window was open get parked in a cache by the
 * service worker. Drain them before anything else, so the day's record is complete
 * before it is displayed or synced.
 */
export async function drainPendingMarks(): Promise<number> {
  if (!('caches' in window)) return 0
  try {
    const cache = await caches.open(PENDING_CACHE)
    const res = await cache.match('/pending')
    if (!res) return 0
    const pending = (await res.json()) as Completion[]
    await cache.delete('/pending')
    for (const p of pending) {
      const existing = await db.completions.where({ itemId: p.itemId, date: p.date }).first()
      if (existing?.id !== undefined) {
        await db.completions.update(existing.id, { state: p.state, at: p.at })
      } else {
        await db.completions.add(p)
      }
    }
    return pending.length
  } catch {
    return 0
  }
}

export async function pushProfile(profile: Profile): Promise<void> {
  const supabase = await getSupabase()
  if (!supabase) return
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await supabase.from('profiles')
    .upsert({ id: data.user.id, data: profile as unknown as Record<string, unknown> })
}

export async function pullProfile(): Promise<Profile | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return null
  const { data } = await supabase.from('profiles').select('data').eq('id', u.user.id).maybeSingle()
  return (data?.data as Profile | undefined) ?? null
}

/**
 * Completions, both directions.
 *
 * Last write wins, compared on the mark's own `at` timestamp. Adequate because the
 * conflict this resolves is genuinely rare — the same obligation, on the same day,
 * marked differently on two devices — and because both answers are the user's own.
 */
export async function syncCompletions(): Promise<{ up: number; down: number }> {
  const supabase = await getSupabase()
  if (!supabase) return { up: 0, down: 0 }
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return { up: 0, down: 0 }
  const userId = u.user.id

  const local = await loadHistory()
  const { data: remoteRows, error } = await supabase
    .from('completions').select('item_id, day, state, at').eq('user_id', userId)
  if (error) return { up: 0, down: 0 }

  const key = (itemId: string, day: string) => `${itemId}|${day}`
  const remote = new Map((remoteRows as Row[] ?? []).map((r) => [key(r.item_id, r.day), r]))
  const localMap = new Map(local.map((c) => [key(c.itemId, c.date), c]))

  const toUpload = local.filter((c) => {
    const r = remote.get(key(c.itemId, c.date))
    return !r || c.at > Date.parse(r.at)
  })

  if (toUpload.length) {
    await supabase.from('completions').upsert(
      toUpload.map((c) => ({
        user_id: userId, item_id: c.itemId, day: c.date,
        state: c.state, at: new Date(c.at).toISOString(),
      })),
      { onConflict: 'user_id,item_id,day' },
    )
  }

  let down = 0
  for (const [k, r] of remote) {
    const l = localMap.get(k)
    const remoteAt = Date.parse(r.at)
    if (l && l.at >= remoteAt) continue
    const existing = await db.completions.where({ itemId: r.item_id, date: r.day }).first()
    if (existing?.id !== undefined) {
      await db.completions.update(existing.id, { state: r.state, at: remoteAt })
    } else {
      await db.completions.add({ itemId: r.item_id, date: r.day, state: r.state, at: remoteAt })
    }
    down++
  }

  return { up: toUpload.length, down }
}

export async function saveSubscription(sub: PushSubscription): Promise<void> {
  const supabase = await getSupabase()
  if (!supabase) return
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return
  const json = sub.toJSON()
  if (!json.keys?.p256dh || !json.keys?.auth) return
  await supabase.from('push_subscriptions').upsert({
    user_id: u.user.id,
    endpoint: sub.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    expired_at: null,
  }, { onConflict: 'endpoint' })
}

/**
 * Replace the queue of future reminders.
 *
 * Deleting the unsent future first is what makes this idempotent: the client can
 * recompute and republish after any change to the Rule, the profile, or the day's marks
 * without accumulating stale rows or double-ringing.
 */
export async function publishReminders(reminders: Reminder[]): Promise<number> {
  const supabase = await getSupabase()
  if (!supabase) return 0
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return 0
  const userId = u.user.id

  await supabase.from('reminders')
    .delete()
    .eq('user_id', userId)
    .is('sent_at', null)
    .gt('fire_at', new Date().toISOString())

  if (!reminders.length) return 0

  const { error } = await supabase.from('reminders').upsert(
    reminders.map((r) => ({
      user_id: userId, item_id: r.itemId, title: r.title,
      body: r.body ?? null, day: r.day, fire_at: r.fireAt.toISOString(),
    })),
    { onConflict: 'user_id,item_id,fire_at' },
  )
  return error ? 0 : reminders.length
}
