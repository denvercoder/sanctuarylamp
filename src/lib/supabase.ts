import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The Supabase client, loaded on demand.
 *
 * Optional by design: the app is local-first (docs/PLAN.md §12) and must work with no
 * account and no network, so every call site treats a missing client as ordinary rather
 * than exceptional.
 *
 * It is also imported DYNAMICALLY. Nothing on the path to first paint needs it — opening
 * the app to check off a Rosary must not wait on an auth library — so it loads when
 * something actually syncs or signs in. The type import above is erased at compile time
 * and pulls in no code.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const authConfigured = Boolean(url && key)

let pending: Promise<SupabaseClient | null> | undefined

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!authConfigured) return Promise.resolve(null)
  pending ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  )
  return pending
}
