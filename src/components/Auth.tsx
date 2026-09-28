import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authConfigured, getSupabase } from '../lib/supabase'

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authConfigured) { setLoading(false); return }
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    void getSupabase().then(async (sb) => {
      if (!sb || cancelled) { setLoading(false); return }
      const { data } = await sb.auth.getSession()
      if (cancelled) return
      setSession(data.session); setLoading(false)
      const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
      unsubscribe = () => sub.subscription.unsubscribe()
    })
    return () => { cancelled = true; unsubscribe?.() }
  }, [])

  return { session, loading }
}

/**
 * Sign-in by emailed link.
 *
 * No password, because a prayer app has no business holding one, and no Google or Apple
 * button by default — plenty of this audience would rather not hand their prayer life to
 * either company to use the app at all.
 */
export function SignIn({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!authConfigured) {
    return <p className="note">Sync is not configured in this build.</p>
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    const sb = await getSupabase()
    if (!sb) { setBusy(false); setError('Sync is not configured.'); return }
    const { error } = await sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else { setSent(true); onDone?.() }
  }

  if (sent) {
    return (
      <p className="note">
        A link is on its way to {email}. Opening it on this device signs you in.
      </p>
    )
  }

  return (
    <form onSubmit={send} className="signin">
      <label className="rubric" htmlFor="email">Email</label>
      <input
        id="email" type="email" required value={email} autoComplete="email"
        onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
      />
      <button type="submit" className="pill" disabled={busy || !email}>
        {busy ? 'Sending' : 'Send a link'}
      </button>
      {error && <p className="rubric">{error}</p>}
      <p className="note">
        An account keeps your record across devices. The app works fully without one.
      </p>
    </form>
  )
}

export function SignOut() {
  if (!authConfigured) return null
  return (
    <button type="button" className="pill"
            onClick={() => void getSupabase().then((sb) => sb?.auth.signOut())}>
      Sign out
    </button>
  )
}
