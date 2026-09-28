# Setup: Netlify + Supabase

## The decision

**Netlify hosts the app. Supabase is the backend.** Netlify is not a compromise here — it is
the right choice, for one reason worth stating plainly:

**This app does not need server-side rendering.** The source of truth is IndexedDB on the
device; it must work in a chapel basement with no signal; every screen is behind auth so
there is nothing to make crawlable. SSR buys us nothing and costs us the thing we actually
need most — direct control of the service worker.

So the recommended stack is **Vite + React + TypeScript, built as a static PWA**, which is
exactly Netlify's sweet spot. This is a change from the earlier draft, which said Next.js.

### Why not Next.js

- **Service worker control.** We need a custom worker for push with notification action
  buttons (*Prayed* / *Snooze 15* / *Later today*), offline prayer texts, and a wake lock.
  In Next.js that means fighting the framework's own asset pipeline. With Vite it is
  `vite-plugin-pwa` plus a hand-written worker, and it is not a fight.
- **Netlify's Next runtime is good but second-class.** Vercel's is first-class. Choosing
  Next means either accepting the lag or moving off Netlify, and neither is necessary.
- **Weight.** A 60fps flame on a five-year-old Android is easier to guarantee without an
  SSR framework's hydration cost.

Cost of the change: no SSR and no SEO for app routes (don't care, it's all behind auth). If
we later want a real content surface — the *Why there are no streaks* page, articles on the
Rule — that can be a small Astro site on the same Netlify account, or plain static pages in
the same build. Neither needs deciding now.

*If you'd rather stay on Next.js, one line changes: `publish = ".next"` in `netlify.toml`
and install `@netlify/plugin-nextjs`. Everything below is otherwise identical.*

## What goes where

```
Netlify     static PWA, deploy previews, custom domain, TLS
Supabase    Postgres + RLS, Auth, pg_cron, Edge Functions (push sender)
Device      IndexedDB (source of truth), service worker, cached prayer texts
```

Supabase supplies the "true backend" — real Postgres with row-level security, hosted auth,
a scheduler, and realtime for households and chapters. Netlify never needs to run a server.

**Push scheduling lives in Supabase, not Netlify.** `pg_cron` fires every minute → a Supabase
Edge Function resolves each user's due items *in their own timezone and coordinates* (solar
noon for the Angelus, sunrise for Prime) → sends VAPID pushes. Colocating the scheduler with
the data avoids a network hop per tick and keeps the timezone logic next to the rows it
reads. Netlify Scheduled Functions would work but would have to reach across the internet to
do it.

## Set up now, in this order

**1. Supabase project** — do this first, it takes a few minutes to provision.
- New project, region closest to you. Save the database password somewhere real.
- Copy the **Project URL** and the **publishable key**. Two places to get them:
  - The **Connect** button at the top of the project dashboard — shows both, formatted for
    pasting straight into `.env`.
  - Or **Settings → API Keys** for the full list.
- **Take the key that starts `sb_publishable_`, not the long one starting `eyJ`.** The `eyJ…`
  JWT is the legacy `anon` key, and Supabase is deprecating legacy keys at the end of 2026 —
  which is now months away, so starting on them would mean a migration before launch. Both
  systems work today; only one of them still will.
- Settings → Database → Extensions: enable **pg_cron** and **pg_net**.

**2. Domain DNS** — point `sanctuarylamp.com` at Netlify.
- Simplest: Netlify DNS. Add the domain in Netlify, then set your registrar's nameservers to
  the four Netlify gives you. Propagation is usually under an hour.
- Or keep your registrar's DNS: `ALIAS`/`ANAME` on the apex → `<site>.netlify.app`, and a
  `CNAME` for `www`.
- TLS is automatic via Let's Encrypt. **Non-negotiable** — service workers, web push, and
  geolocation all require HTTPS.

**3. Netlify site** — connect the GitHub repo once I've scaffolded it. `netlify.toml` is
already committed, so build settings need no clicking.

**4. VAPID keys** — for web push. Generate them yourself so I never see the private key:

```bash
npx web-push generate-vapid-keys
```

Then: public key → Netlify env var `VITE_VAPID_PUBLIC_KEY`. Private key → **Supabase Edge
Function secrets only**, never Netlify, never the repo.

**5. Netlify environment variables**
```
VITE_SUPABASE_URL                https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY    sb_publishable_...
VITE_VAPID_PUBLIC_KEY            <vapid public key>
```

All three are safe to expose in the client bundle — that is what publishable means. The keys
that must never leave a server are the Supabase **secret** key (`sb_secret_…`) and the VAPID
private key, and neither belongs in Netlify at all; both live in Supabase Edge Function
secrets. Everything that protects user data is enforced by row-level security in Postgres,
not by hiding the publishable key.

## Three things to know before you commit money or time

**Supabase's free tier pauses a project after 7 days without API activity.** For an app whose
whole job is to send a notification at 6am, a paused database is a silent failure. Daily use
will keep it awake, but once this is live and other people depend on it, budget **Supabase
Pro at $25/month**. Netlify's free tier is genuinely fine for a long while. Total to build:
$0 plus the domain.

**Web push from a Deno Edge Function needs a spike.** VAPID signing in Deno is doable but the
usual `web-push` npm package is Node-shaped. I'll prove this end-to-end early in Phase 1
rather than at the end — if it fights us, the fallback is a tiny Node function on Netlify
Scheduled Functions or Fly.io, which changes nothing else in the architecture.

**iOS only delivers web push to a PWA added to the Home Screen** (16.4+). This is the single
biggest product risk and it is a design problem, not a technical one: onboarding must walk
iPhone users through *Share → Add to Home Screen* with a screenshot, or notifications simply
never arrive and they conclude the app is broken. The ICS feed is the fallback for anyone who
declines.
