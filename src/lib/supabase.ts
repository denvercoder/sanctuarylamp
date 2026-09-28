import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The Supabase client.
 *
 * Optional by design. The app is local-first (docs/PLAN.md §12) and must work with no
 * account and no network, so every call site treats a null client as ordinary rather
 * than exceptional.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export const authConfigured = Boolean(supabase)
