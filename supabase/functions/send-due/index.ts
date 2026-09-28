/**
 * send-due — deliver reminders that have come due.
 *
 * Invoked every minute by pg_cron. It does no liturgical reasoning whatsoever: the client
 * computes when each obligation falls due, in its own timezone and at its own solar
 * times, and writes rows to `reminders`. This function only delivers them. That keeps the
 * 1962 calendar and the rule engine in one tested implementation rather than two that can
 * drift apart.
 *
 * Deploy:
 *   supabase functions deploy send-due --no-verify-jwt
 *   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@sanctuarylamp.com'

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

type Reminder = {
  id: string; user_id: string; item_id: string
  title: string; body: string | null; day: string
}

type Sub = {
  id: string; endpoint: string; p256dh: string; auth: string
}

Deno.serve(async () => {
  const startedAt = Date.now()

  // Only unsent reminders that have actually come due. A missed cron tick simply
  // delivers late rather than dropping anything — `fire_at <= now()` has no lower bound
  // on purpose, but see the staleness guard below.
  const { data: due, error } = await db
    .from('reminders')
    .select('id, user_id, item_id, title, body, day')
    .is('sent_at', null)
    .lte('fire_at', new Date().toISOString())
    .gte('fire_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .limit(500)

  if (error) return json({ error: error.message }, 500)
  if (!due || due.length === 0) return json({ sent: 0, ms: Date.now() - startedAt })

  // One key pair, imported once for the whole batch.
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: VAPID_SUBJECT,
    vapidKeys: await webpush.importVapidKeys(
      { publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE },
      { extractable: false },
    ),
  })

  const byUser = new Map<string, Reminder[]>()
  for (const r of due as Reminder[]) {
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r])
  }

  const { data: subs } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', [...byUser.keys()])
    .is('expired_at', null)

  const subsByUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as (Sub & { user_id: string })[]) {
    subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s])
  }

  const delivered: string[] = []
  const expired: string[] = []

  for (const [userId, reminders] of byUser) {
    const userSubs = subsByUser.get(userId) ?? []
    for (const r of reminders) {
      const payload = JSON.stringify({
        title: r.title, body: r.body ?? undefined, itemId: r.item_id, date: r.day,
      })
      for (const s of userSubs) {
        try {
          const subscriber = appServer.subscribe({
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          })
          await subscriber.pushTextMessage(payload, {})
        } catch (e) {
          // 404/410 mean the browser threw the subscription away. Stop retrying it.
          const msg = String(e)
          if (msg.includes('404') || msg.includes('410') || msg.includes('gone')) {
            expired.push(s.id)
          } else {
            console.error('push failed', s.id, msg)
          }
        }
      }
      // Marked sent even with no live subscription: a reminder whose moment has passed
      // should not fire hours later when a new device registers.
      delivered.push(r.id)
    }
  }

  if (delivered.length) {
    await db.from('reminders')
      .update({ sent_at: new Date().toISOString() })
      .in('id', delivered)
  }
  if (expired.length) {
    await db.from('push_subscriptions')
      .update({ expired_at: new Date().toISOString() })
      .in('id', expired)
  }

  return json({
    sent: delivered.length, expiredSubscriptions: expired.length, ms: Date.now() - startedAt,
  })
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  })
}
