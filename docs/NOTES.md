# Running notes

Decisions and requirements as they land. Newest at the bottom.

## 2026-09-27
- **Name: Sanctuary Lamp.** Domain `sanctuarylamp.com` (purchasing).
  Rejected: Sevenfold, Keep the Hours, Vigil Light, Kneeler, Trimmed Lamps.
  Latin names dropped deliberately — English reads to a wider audience.
- **Use the Sanctuary Lamp aesthetic as the design spine.** See PLAN.md §2 —
  dark-first "nave at night", sanctuary red, brass, parchment, Cardo, rubrics in red,
  the lamp never goes out.
- **User accounts are required.** Not an optional/local-only app.
- **Hosting:** Netlify preferred, but a true backend is needed and that takes priority.
  Current plan: Netlify (frontend) + Supabase (Postgres, Auth, RLS, cron, realtime).
- Web first, mobile friendly. PWA.
- Must have: browser notifications, prayer checkboxes, custom prayer routine.

## 2026-09-27 (cont.)
- **Rule source (authoritative): the 2013 US District printing** of the 1980 Lefebvre text
  (*Sursum Corda* no. 4). The 2024 Canada handbook is the *reference* edition only —
  prayer texts, meditation method, examen. Never silently merged. See RULE-EDITIONS.md.
- Rule encoded at `rules/sspx-third-order.us-1980.yaml` — 28 items, 20 obligations,
  14 carrying the handbook's own examen question.
- **Rule engine must work for ANY Catholic third order** — Benedictine oblates, Carmelites
  (OCDS), Dominican laity, Franciscans (OFS). SSPX is the first template, not the model.
  Schema at `docs/SCHEMA.md`.
- **The lamp brightens as you pray.** Prominent on landing; tap for full-screen lamp.
  Reflects *today* only, floor never dark. See LAMP.md.
- **Stripped full-screen prayer mode = "Recollection"** (explicitly not "Zen mode").
- Open: does the married section apply? Which "vigils of great feasts" do you keep?
- **Married: yes.** State of life is a *profile toggle*, not a fork of the Rule — one Rule
  file serves married/single/parent/priest via `appliesTo`. 5 items now activate.
- **Fasting vigils: ALL of them.** Resolved to the four 1962 fasting vigils (Christmas,
  Pentecost, Assumption 14 Aug, All Saints 31 Oct). Vigil of the Immaculate Conception
  (7 Dec) available as opt-in — pre-1955, priests only in the CA edition.
  *Still worth confirming the four-vigil list with the chaplain.*
- **CORRECTION: the sanctuary lamp's glass is ALWAYS red.** Not a theme slot. Liturgical
  colour moves to the ribbon (primary), the altar frontal wash, and the ordo chip.
  See COLOR.md.
- **Liturgical colours follow 1962, not the modern scheme** — violet for Septuagesima,
  black on Good Friday and All Souls, no blue, gold as substitute for white/red/green only.
- **The lamp IS extinguished Holy Thursday → Easter Vigil** (empty tabernacle). Doctrine
  sharpened to: *the lamp never goes out because of you.* Relit from new fire at the Vigil.
- Bug found in own schema: YAML 1.1 parses a bare `on:` key as boolean `true`. Cadence key
  renamed `on` → `onDays` in schema and rule file.

## 2026-09-27 — Phase 1, first pass
- Stack confirmed: **Vite + React + TS, static PWA on Netlify, Supabase backend.**
- Supabase project `gjpagpiagbrakvprjzxk` live; publishable key + VAPID public key in
  `.env.local` (gitignored). Auth: email only, signups open, no OAuth yet.
- **Calendar engine** `src/lib/kalendar` — 1962 calendar. 63 tests: 19 published Easter
  dates incl. both extremes, 500-year invariants, Ember Days, seasons, 1962 colours.
- **Rule engine** `src/lib/rule` — 36 tests. Alternatives, degrading cadence, state of
  life, nested predicates, the lamp's lumen doctrine.
- **Two real bugs caught by tests**, both silent-failure class:
  1. `on:` as a cadence key parses as boolean `true` in YAML 1.1 (PyYAML) but as the
     string `"on"` in YAML 1.2 (the `yaml` npm package) — so a rule file behaves
     differently depending on the tool. Renamed `onDays`, plus a key whitelist in the
     loader that rejects `on`/`off`/`yes`/`no` with an explanatory error.
  2. Month/year cadences were approximated as 31/366 days, so a retreat kept 2025-06-01
     showed as due 2027-06-03 instead of 2027-06-01. Replaced with real calendar
     arithmetic that clamps to short months.
- `fast-priests` needed a nested predicate: "all Fridays in Lent" is a conjunction, and
  a flat list matches every Friday of the year *and* all of Lent. `Pred` now supports
  `all` / `any` / `not`.
- **Lamp** built (inline SVG + CSS, no canvas). Flame sits BEHIND translucent red glass,
  which is how a real one reads. Candle flicker is three co-prime tracks (5.7s / 8.3s /
  23.1s) so the combined cycle is ~18 min and never visibly loops; the long track holds
  still then dips, like a draught catching the wick. Two transform animations had to be
  split onto nested SVG groups — on one element the later declaration silently wins.
- **Recollection** built. Wake lock, no countdown, controls fade after 3s.
- Verified in-browser: lumen 0.25 → 0.357 on one of seven obligations kept.

### Not done yet (next pass)
- Supabase auth wiring, sync, RLS policies
- Service worker, web push, the Deno VAPID spike, PWA manifest + iOS install walkthrough
- Prayer texts (blocked on permission from the District — see RULE-EDITIONS.md)
- Sanctoral cycle: `rank` is only populated for Sundays and principal feasts
- `yaml` parser ships in the bundle (145 kB gzip total); precompile the Rule to JSON
- **The app is not a prayer book and will not become one.** The user prays Prime and
  Compline from a printed Angelus Press Roman Breviary; so does the audience. Bundled
  prayer texts are cut from the plan entirely (PLAN.md §8 rewritten).
  - What software is actually good for here is **the ordo**: which office it is, its
    season, and the colour — so the breviary ribbons go in the right places. Added
    `ordoLine()` to the calendar engine and wired it into the day bar and Recollection.
  - Knock-on: the translation-licensing problem disappears, nothing ships blocked on
    permission, and Recollection gets better — a flame and the day's designation beside
    the open book, instead of text competing with the page being read.
  - Only user-supplied text (their own chapter's proper, a prayer from their chaplain)
    still has a place.
- **Three breviary editions modelled** (`src/lib/books.ts`), because which book you own
  changes what the app should say:
  1. Angelus Press, 2 vol, **Latin only** — all hours
  2. Baronius Press, 3 vol, Latin/English — all hours
  3. Angelus Press *The Divine Office*, Latin/English — every hour but Matins on Sundays;
     Prime, Terce, Sext, None, Compline on other days
  - Feature that falls out: **which volume to pick up today.** Grabbing the wrong volume
    of a multi-volume breviary is a daily annoyance and software can just answer it.
  - Also: whether today's hour is even *in* your edition. Prime and Compline are in all
    three every day, so the Rule is satisfiable from any of them — worth stating in the app.
  - Volume splits for editions 1 and 2 are **marked `confirmed: false`** and the UI labels
    them "unverified". Guessing a volume boundary confidently would send someone to the
    wrong book. NEEDS: the actual season/date ranges printed in each set.
  - Default profile is currently edition 3. NEEDS: confirm which one is actually in use.
- Still no settings UI — book choice, scrupulosity mode and state of life are all
  hard-coded in `DEFAULT_PROFILE` for now.
- **Books are assigned PER HOUR, not per person.** User prays Compline from the Angelus
  Latin-only 2-vol and Prime + Lauds from the Baronius 3-vol. `Profile.books` is now a
  map of hour → book id, and each office line names its own book and volume.
- Angelus 2-vol volumes are labelled **Tomus Prior / Tomus Alter**, as printed on the
  spine — this edition is Latin only, so an English paraphrase would not match the shelf.
  Boundary still unconfirmed: a 2-vol breviary condensed from the 4-vol set may turn at
  Easter or at Pentecost, and those disagree across the whole of Paschaltide. NEEDS check.
- Baronius split also unconfirmed. Their site does not publish it; the set descends from
  the 1963 Collegeville 3-vol, which supports the Advent–Lent / Lent–Pentecost / after
  Pentecost guess but does not prove it.
- **`Profile.personalItems` added** — the user's own routine, beyond the Rule. This is the
  "custom prayer routine" requirement. Lauds lives here, not in the Rule file: the Third
  Order asks for morning and evening prayer, which Prime and Compline discharge, so Lauds
  is his own resolution and the Rule file stays the Society's.
- **Rule clarification: "morning and evening prayer" means ANY two hours of your choosing**,
  per the chaplain — not Prime and Compline specifically. User prays three (Lauds + Prime
  in the morning, Compline in the evening) because Lauds is long and the little hours are
  short. TODO: the `morning-prayer` / `evening-prayer` items should let the user nominate
  which hours discharge them, rather than hard-coding Prime/Compline as the alternatives.

## 2026-09-27 — Phase 1, second pass: the site
- **Icons** generated from the lamp with ImageMagick. Transparent, lamp only (no plate,
  no suspension ring — it floated disconnected at small sizes). Two exceptions keep an
  opaque ground: iOS composites a transparent apple-touch-icon on black, and a maskable
  icon must bleed to the crop edges.
- **PWA**: hand-written service worker via `injectManifest` — push with action buttons
  and true offline use are exactly what a generated worker makes awkward.
  - Notification actions: *Prayed* / *Snooze 15*. A tap on "Prayed" posts to an open
    window, or queues in a cache for next launch if none is open, so a Rosary is checked
    off without opening the app. The worker passes the reminder's own day so a late tap
    marks the right day rather than today.
  - Gotcha: the dev worker is served at `/dev-sw.js`, production at `/sw.js`. Hardcoding
    either gives a silent `unsupported MIME type ('text/html')` failure in the other —
    now registered through the plugin's own helper.
  - `actions` and `renotify` are missing from lib.dom's NotificationOptions (it only
    describes the Notification constructor); typed locally.
- **Solar times** (`src/lib/solar.ts`), NOAA algorithm, ~60 lines, no dependency. Verified
  against Denver day lengths at both solstices and the equinox, and returns null for
  Tromsø in December. Prime lands at first light and drifts correctly across the year.
- **Backend** written, not yet deployed:
  - `supabase/migrations/0001_init.sql` — profiles, completions, push_subscriptions,
    reminders. RLS on every table from the start, written with the first table rather
    than bolted on, because the examen is the most private data this app will hold.
  - `supabase/functions/send-due/index.ts` — the sender. **Does no liturgical reasoning.**
    The client computes when things fall due and writes rows to `reminders`; the server
    only delivers. That keeps the 1962 calendar and the rule engine in ONE tested
    implementation instead of a second one in Deno that can silently disagree.
  - `0002_cron.sql` — pg_cron every minute, project ref already filled in.
- **Settings screen**: notifications (with the full iOS Add-to-Home-Screen explanation),
  per-hour book pickers, state of life, opt-ins from the other edition, scrupulosity
  toggle, and magic-link sign-in. Profile persists to IndexedDB.
- Auth is email magic link only — no Google or Apple button. Plenty of this audience
  would rather not hand their prayer life to either company to use the app at all.

### Still to do
- Deploy: `supabase db push`, `supabase functions deploy send-due`, secrets, Netlify site
- The reminder-queue writer on the client (computes fire_at from TimeAnchor + solar)
- Sync completions up/down; drain the service worker's pending-marks cache on launch
- Geolocation permission flow for solar anchors (falls back to clock times without it)
- `morning-prayer` / `evening-prayer` should let the user nominate which hours discharge
  them, rather than hard-coding Prime/Compline
- **Recollection on desktop now uses a separate, far more detailed lamp** (`LampGreat`),
  at `min(88vh, 1100px)`, with the room itself lit by a viewport-wide wash driven by
  `--lumen`. Phones and tablets keep the compact lamp. See LAMP.md "The great lamp" —
  including the three bugs (degenerate gradients on zero-width strokes, opaque glass
  hiding the fire, and `position: relative` overriding the overlay's `fixed`).

## 2026-09-27 — Stage 2: reminders, sync, location
- **`src/lib/reminders.ts`** — computes when each obligation falls due, on the CLIENT.
  - **Nothing rings for an item with no time.** The Rule gives no hour for the Rosary, so
    the app does not invent one; it stays silent until the user sets a time. An app that
    guesses when you ought to pray is worse than one that says nothing.
  - `Profile.itemTimes` overrides an item's own anchor; solar anchors need coordinates
    and go silent without them rather than falling back to a guessed clock time.
  - Already-kept and excused items are skipped.
  - **The Great Silence** — a nightly quiet window that correctly wraps past midnight
    (21:30–06:00 is one interval, not two).
- **Timezone bug found by a test**: `resolveAnchor` built a clock time with
  `new Date(utcMidnight)` then `setHours()`. West of Greenwich that instant is already the
  *previous* local date, so 07:00 on Ash Wednesday fired at 07:00 on Shrove Tuesday in
  Denver. Now built from the liturgical day's calendar fields. Regression test added.
- **`src/lib/sync.ts`** — all best-effort and additive; nothing in the UI waits on it.
  - `drainPendingMarks()` runs before first render, so marks made from a notification
    while the app was closed are in the record before it is displayed.
  - Completions sync both ways, last-write-wins on the mark's own `at`.
  - `publishReminders()` deletes the unsent future and rewrites it, so it is idempotent:
    the client can republish after any change without stale rows or double-ringing.
- **`src/lib/geo.ts`** — coordinates rounded to 3dp (~100m), which is far more than a
  sunrise needs and less to store.
- **Settings** gained: per-item bell times, the Great Silence window, and location.
- 143 tests.

### Stage 3 remains
`supabase login` / `link`, then `db push`, secrets, `functions deploy`, the cron Vault
secret — and the end-to-end push test, which is still the one unproven piece.
- **Rosary mysteries by day, 1962** (`src/lib/rosary.ts`). Three sets, not four — the
  Luminous Mysteries are from *Rosarium Virginis Mariae* (2002) and including them would
  be the most obvious possible tell that the app did not know what it was doing.
  - Joyful: Mondays, Thursdays, and Sundays from Advent until Lent
  - Sorrowful: Tuesdays, Fridays, and the Sundays of Lent and Passiontide
  - Glorious: Wednesdays, Saturdays, and the Sundays from Easter to Advent
  - Explicitly NOT the modern scheme, which moved Joyful to Saturday and gave Thursday to
    the Luminous. Tests assert both differences.
  - Shown on the Rosary item with all five decades, and carried in the notification body
    so you do not have to open the app to find out which mysteries it is.
  - **Open question — Holy Week.** The distribution is weekday-based outside Sundays and
    says nothing about the Triduum, so read literally it gives the Joyful Mysteries on
    Holy Thursday and the Glorious on Holy Saturday. Many pray the Sorrowful throughout.
    The engine follows the rule as written and raises the question rather than inventing
    an exception. ASK THE CHAPLAIN.
