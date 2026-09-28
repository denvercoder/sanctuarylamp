# Sanctuary Lamp

**sanctuarylamp.com** — a rule-of-life companion for Catholics under a rule, built first for
Third Order members of the SSPX, and useful to any tertiary, oblate, or serious layman.

> The sanctuary lamp burns before the tabernacle day and night. Nobody scores it.
> Someone tends it.

That sentence is the product thesis, the visual identity, and the answer to the hardest
design question in this category, all at once. See §3.

---

## 1. What exists, and why it isn't this

| App | What it is | What it can't do |
|---|---|---|
| Hallow | Guided audio, subscription, huge content library | Doesn't know your Rule. Content to consume, not obligations to keep. |
| Amen (Ascension) | Liturgy of the Hours + audio | Novus Ordo only. No personal rule, no tracking. |
| iBreviary / Divine Office / Universalis | Prayer *texts* | Reference books. No routine, no accountability, no notifications tied to a rule. |
| Exodus 90 | Fixed 90-day ascetical program | One rule, not *your* rule. Ends after 90 days. |
| Echo / PrayerMate | Prayer-intention lists | Intentions float free of any daily structure. |
| Streaks / Habitica / any habit tracker | Generic habit chains | Theologically illiterate. A missed Rosary is not a broken chain, and the calendar changes the obligations. |

**The gap:** nothing on the market models *a rule of life* as a first-class object, and
nothing understands that the obligations themselves change with the liturgical calendar.
Everything else is a habit tracker with a crucifix on it.

Two engines are the whole moat:

1. **The Rule Engine** — a declarative schema describing obligations, counsels, and
   personal resolutions with recurrence and calendar predicates.
2. **The Calendar Engine** — the 1962 Roman Calendar computed in code: seasons, feast
   ranks, liturgical colors, Ember Days, Rogation Days, vigils, First Fridays and
   Saturdays, Paschaltide.

Compose them and you get: *given who you are and what today is, here is what you owe.*
Nobody has built that.

---

## 2. Aesthetic: the nave at night

Dark-first. Warm, not cold. It should feel like a hand-bound diurnal read by lamplight,
not like a fintech dashboard. Every competitor looks like a Series A pitch. We look like a
book someone's grandmother owned.

**Palette**

```
ink        #14110F   near-black, warm     — default background
nave       #1E1A17   raised surfaces
parchment  #F4EFE6   light mode ground / dark mode text
sanctuary  #8E2B20   the lamp's red glass — rubrics, the flame
ember      #C24A32   the flame's lit state, focus rings
brass      #B08D57   hairline rules, the lamp's chain, dividers
```

Liturgical accent overrides the neutral chrome by season, automatically:
violet `#4B2E5A` (Advent, Lent), rose `#C98B9B` (Gaudete, Laetare), green `#3F5E4A`
(after Pentecost), gold `#B08D57` (feasts, Paschaltide), black `#14110F` (All Souls,
Good Friday), red `#8E2B20` (martyrs, Pentecost).

**Type** — `Cardo` for prayer text and body (it was cut for classical and liturgical
typesetting; full Latin diacritics, real small caps). Letter-spaced small caps for
headings. Ragged-right. Generous margins. Drop caps on prayer openings.

**Rubrics in red.** This is the detail that will make traditional Catholics trust the app
on sight: *rubrica* means red. Every instruction — "stand", "make the sign of the cross",
"omit during Passiontide", "here the Angelus is replaced by the Regina Cæli" — is set in
`sanctuary` red, in italic small caps, exactly as in a missal. Prayer text is black on
parchment or parchment on ink. No other app does this and it costs us nothing.

**The lamp.** A persistent flame in the header. Its glow deepens as the day's Rule is
kept — and it **never goes out**. Not on a missed day, not on a missed month. That is not
a decorative choice, it is the doctrine of §3 rendered in CSS. The unchecked state of a
checkbox is an unlit wick; the checked state is a lit one. No green checkmarks anywhere.

**Motion** — candle flicker and slow fades only. Nothing bounces. Nothing celebrates.
A completed day earns a warmer glow and silence.

**Sound** — one recording of a real bronze bell, used sparingly and optionally, for the
Angelus hours.

---

## 3. The streak doctrine (opinionated, and the reason people will stay)

Streak mechanics are spiritually dangerous. They manufacture pride on day 80 and despair
on day 81, and they make scrupulous people worse. Habit apps ship them because they drive
retention. We refuse them, and we say so publicly, on a page called *Why there are no
streaks*.

What replaces them:

- **A missed obligation offers three honest responses:** *make it up*, *excused*
  (legitimate impediment — illness, travel, obedience, charity), or *note it* (goes to
  the direction log, §6). Never a broken chain, never a red X, never a guilt push.
- **Fidelity over time, not consecutive days.** A year-in-pixels grid tinted with each
  day's liturgical colour. Honest, beautiful, and framed around *returning* rather than
  *not breaking*. It reads as a stained-glass window by December.
- **The Rule's own rest is respected.** Days the Rule relaxes — Sundays, feasts of the
  first class, days with a legitimate dispensation — don't count against you, because
  keeping the Rule *is* keeping its relaxations.
- **Scrupulosity mode.** One switch hides every counter, chart, and history view. The
  entire app collapses to one question at night: *Did you keep the Rule today?*
  Yes / Partly / No. Nothing is ever shown back to you. This ships in v1, not "later."
- **No engagement notifications, ever.** We will never send "you haven't prayed in 3
  days 😢". Notifications ring for the hours in your Rule and for nothing else.

---

## 4. The Rule Engine

A Rule is a versioned document. Obligations are typed, because canonically they are not
equal:

- `obligation` — binding under the Rule
- `counsel` — recommended, not binding
- `resolution` — your own, from meditation or direction (and revisable)

Each item carries a recurrence *and* an optional calendar predicate, which is what makes
this more than a to-do list.

```ts
type Rule = {
  id: string; name: string; version: number;
  tradition: 'sspx-third-order' | 'ocds' | 'op-laity' | 'osb-oblate' | 'ofs' | 'custom';
  stage?: 'postulant' | 'novice' | 'professed';
  items: RuleItem[];
};

type RuleItem = {
  id: string;
  title: string;                      // "Fifteen minutes of mental prayer"
  kind: 'obligation' | 'counsel' | 'resolution';
  cadence: Cadence;                   // daily | weekly | monthly | annual | seasonal
  when?: TimeAnchor;                  // clock time, or sun-relative, or office-relative
  onlyIf?: CalendarPredicate[];       // ember-day, lent, first-friday, feast-rank<=2, …
  replacedBy?: { predicate: CalendarPredicate; itemId: string }[];
  prayerId?: string;                  // links to bundled or user-supplied text
  durationMin?: number;               // for timed items (mental prayer, reading)
  notify?: NotifyPolicy;
};
```

`replacedBy` is the feature that proves we know what we're doing: **the Angelus is
automatically replaced by the Regina Cæli from Holy Saturday through the Saturday after
Pentecost.** It happens without the user configuring anything, and a red rubric explains
why. Nothing else on the market does this.

The Rule **is** obtainable, and we now have two editions of it — see
[RULE-EDITIONS.md](RULE-EDITIONS.md). The normative one is the 1980 promulgation as printed
by the US District (*Sursum Corda* no. 4, Winter 2013); the 2024 Canada handbook is a
reference edition supplying prayer texts, a meditation method, and an examination of
conscience keyed to the Rule. They differ on which days are fast days and on what
discharges the daily obligation, so `Rule` carries an `edition` and the app supports a
diff view between editions.

Both are SSPX publications and the 2024 handbook is explicitly copyrighted, so **we ship
structure, not text**, until permission is granted. `text:` fields stay empty and the user
supplies or pastes their own.

- The Rule is encoded at [`rules/sspx-third-order.us-1980.yaml`](../rules/sspx-third-order.us-1980.yaml):
  28 items, 20 of them obligations, 14 carrying the handbook's own examen question.
- Templates for Carmelite (OCDS), Dominican laity, Benedictine oblate, and Franciscan (OFS)
  rules, plus a blank custom rule. The schema was validated against all four — see
  [SCHEMA.md](SCHEMA.md) — so the engine is genuinely general, not SSPX-shaped.
- Import/export a Rule as a single readable YAML file. Your rule is yours and portable.

---

## 5. The Calendar Engine

A standalone, dependency-free TypeScript package (`@sanctuarylamp/kalendar`), unit-tested
against known years, and worth open-sourcing on its own.

Computes for any date: season, the day's office and its rank, liturgical colour,
commemorations, and the flags the Rule Engine predicates against — Ember Wednesday/Friday/
Saturday, Rogation Days, vigils, Ash Wednesday, Good Friday, First Friday, First Saturday,
Paschaltide, Passiontide, Septuagesima, the All Souls octave.

Default calendar: **1962 Roman**. Pluggable, so a Novus Ordo, Byzantine, or Anglican
calendar can be added later without touching the Rule Engine.

**Sun- and office-relative scheduling.** The Angelus is not "6 / 12 / 6"; it is a bell at
dawn, noon, and dusk. With permission we use the device's coordinates to compute true
sunrise, solar noon, and sunset, so Prime lands at first light and Compline at nightfall,
and both drift correctly across the year. Muslim prayer apps have done this beautifully
for fifteen years and Christian apps have simply never bothered. We bother.

---

## 6. The spiritual engine: the loop nothing else has

This is the part that makes Sanctuary Lamp a formation tool rather than a checklist.

```
mental prayer  →  a resolution  →  particular examen  →  monthly report  →  direction
      ↑                                                                        │
      └────────────────────────────────────────────────────────────────────────┘
```

- **Mental prayer timer** with optional method scaffolding (Ignatian or Salesian:
  preparation, composition of place, points, colloquy, resolution). Silent, no audio,
  no voice. It ends by asking for one resolution.
- **Particular examen** on that single resolution, recorded the traditional way — twice
  daily, as a dot grid, counting falls. Brutally simple, and no app implements it.
- **Monthly recollection** produces a **printable one-page report for your confessor or
  director**: fidelity to each item of the Rule, the particular examen's grid, what you
  noted, what you asked to be excused. Paper. Foldable. Bring it to the priest.
  I have not found a single app that closes this loop, and it is the thing a tertiary
  actually needs.
- **Formation stage tracking** — postulancy (a one-year probation per sspx.org), novitiate,
  profession, with the required reading and an honest countdown; plus *retreat due in 4
  months* and *confession overdue* as Rule-aware compliance, not habit nagging.

---

## 7. Notifications

Web Push (VAPID) through a service worker, with **action buttons on the notification
itself** — *Prayed* · *Snooze 15* · *Later today* — so the Rosary gets checked off from
the lock screen without opening the app.

- **The bell.** Angelus hours ring a real bronze bell, if you want them to.
- **The Great Silence.** A nightly quiet window; nothing rings inside it.
- **Quiet in church.** Your Mass times are silent by default.
- **Hard constraint to design around:** iOS only delivers web push to a PWA the user has
  added to the Home Screen (16.4+). Onboarding must walk iPhone users through *Share →
  Add to Home Screen* explicitly, with a screenshot, or notifications silently never
  arrive and they'll assume we're broken. Fallbacks for anyone who declines: an in-app
  schedule view, and a subscribable **ICS feed** so the Rule lands in whatever calendar
  they already trust.

---

## 8. The book stays the book

**Sanctuary Lamp is not a prayer book and will not try to become one.**

The people who keep a rule of life already own the books. The hand missal, the Roman
Breviary, the manual of prayers — owning and using them *is* the culture this app serves.
Prime and Compline get prayed from an Angelus Press Roman Breviary, in print, and that is
not a deficiency to be solved. An app that reproduces the text is competing with
iBreviary and Universalis on their own ground, for a need its users do not have, and
taking on a pile of translation licensing to do it.

So the app does the thing the book cannot: **it tells you which office it is.**

That is an *ordo* — the thin annual booklet a traditional Catholic keeps beside the
breviary precisely because the book itself cannot tell you which of its parts to pray
today. It is the single most useful thing software can do for someone holding a breviary,
and the calendar engine already computes every part of it:

- the day and its rank
- the season
- **the liturgical colour, named** — which is how you set the ribbons
- the commemorations, once the sanctoral lands
- whether the Angelus or the Regina Cæli is said today

Consequences, all of them good:

- **The copyright problem mostly evaporates.** No bundled translations means no licensing,
  no permission dependency, and nothing to renegotiate. See [SOURCES.md](SOURCES.md).
- **Recollection gets better, not worse.** No wall of scrolling text competing with the
  page you are actually reading. The phone lies on the prie-dieu showing a flame and the
  day's designation while you hold the book. That is the correct relationship between the
  two objects.
- **The app gets smaller and faster**, which serves the sixty-frames-on-an-old-Android
  goal directly.

The one place text still belongs: a user's *own* text, pasted in — a proper of their
chapter, a prayer for the Society, something their chaplain gave them. Their words, their
copy, their business.

## 9. Intentions that actually get prayed

A list of two hundred intentions is a list nobody prays. So intentions are *injected into
the Rule*: "At today's Rosary, remember Margaret." Rotating, so everything gets covered
over weeks instead of the top five getting covered forever.

Dated intentions — anniversaries of death raise a De Profundis prompt, baptismal and
ordination anniversaries surface on the day. An *answered* archive, which is the part that
builds faith over years.

---

## 10. Household and fraternity

Traditional Catholic life is not solitary, and this is the feature that spreads the app
inside a chapel without a marketing budget.

- **Household** — one family Rosary, checked once for the house. Parents see their
  children's routines as encouragement, not surveillance (aggregate only, no examen data,
  ever).
- **Chapter / fraternity** — your Third Order chapter as a group, showing aggregate and
  anonymous: *your chapter prayed 412 Rosaries this month.* Never per-member leaderboards.
- **Spiritual bouquets** — a group pledges N Rosaries for an intention (a sick member, a
  priest, an ordination) and the app tallies toward it and prints the bouquet card. This
  is a centuries-old practice that no software supports, and it is inherently viral.
- **Novena and adoration relays** — sign up for the 3 a.m. slot in a 24-hour rosary relay;
  the app wakes you and shows you who has the hour after yours.
- **Adopt a seminarian or priest** — a tracked prayer pledge for a named vocation.

Privacy rule, absolute: the examen, the direction log, and the noted failures are never
shared with anyone, at any tier, for any reason.

---

## 11. Paper and export

Traditional Catholics love paper, and paper is also the honest backup.

- A **printable pocket horarium card** for a wallet or breviary ribbon.
- The monthly direction report (§6).
- A year calendar with the Rule's fixed observances marked.
- An **ICS subscription** for the Rule, and a second for the 1962 liturgical calendar.
- Full **JSON/YAML export** of everything, on demand, no friction. If we ever fold, the
  user keeps their prayer life.

---

## 12. Architecture

**Recommendation: Netlify for the app, Supabase for the backend.** This honours the
Netlify preference and still gives a real backend — Postgres, hosted auth, row-level
security, cron, and realtime — without standing up servers.

```
Vite + React + TS (PWA)    →  Netlify (static, deploy previews, TLS)
Supabase                   →  Postgres + Auth + RLS + Realtime + pg_cron + Edge Functions
Service worker (hand-rolled)→ Web Push (VAPID) with action buttons, offline cache
Dexie (IndexedDB)          →  local-first store, source of truth on device
@sanctuarylamp/kalendar    →  pure-TS 1962 calendar engine (own package, unit-tested)
@sanctuarylamp/rule        →  pure-TS rule evaluator (date + rule → today's obligations)
```

**Not Next.js.** The source of truth is IndexedDB, it must work offline, and every screen is
behind auth — so SSR buys nothing and costs us direct control of the service worker, which we
need for push action buttons and offline prayer texts. Full reasoning in [SETUP.md](SETUP.md).

- **Accounts:** Supabase Auth — email magic link and Apple/Google OAuth. Required for
  sync, household, and chapter features.
- **Local-first anyway.** IndexedDB is the device's source of truth; the server is for
  sync and community. The app must work fully in a basement with no signal, and an outage
  must never cost someone their record.
- **Push scheduling:** `pg_cron` every minute → Supabase Edge Function → resolves each
  user's due items in *their* timezone and coordinates → sends VAPID pushes. Cron on the
  database side rather than Netlify's scheduler, because per-minute accuracy matters when
  the Angelus is tied to actual solar noon.
- **Privacy posture as a feature:** examen and direction entries are encrypted client-side
  before sync, so the server cannot read them. We say this on the marketing page, in
  plain words, and it is the sharpest possible contrast with the incumbents. No ads, no
  data sale, no engagement optimisation.
- **Tests that matter:** the calendar engine against known years (Easter, Ember Days,
  Paschaltide boundaries) and the rule evaluator against hand-built fixtures. The UI can
  be tested lightly; these two cannot.

---

## 13. Roadmap

**Phase 1 — Keep the lamp lit (MVP).**
Accounts, Rule builder with the SSPX skeleton, Today screen, check-off, local-first
storage, PWA install flow (with the iOS walkthrough), web push with action buttons,
horarium editor, the aesthetic in full, scrupulosity mode. *Ships to one user: you.*

**Phase 2 — The calendar knows.**
`kalendar` engine, calendar-aware obligations, `replacedBy` (Angelus → Regina Cæli),
Ember Days and fasts appearing on their own, liturgical colour throughout, sun-relative
scheduling, bundled offline prayer texts.

**Phase 3 — Formation.**
Mental prayer timer with method scaffolding, resolutions, particular examen grid, monthly
recollection, the printable direction report, formation stages, ICS feeds, print layouts.

**Phase 4 — Community.**
Household, chapter aggregates, spiritual bouquets, relays, adopt-a-seminarian, intention
rotation.

**Phase 5 — Beyond one society.**
Carmelite, Dominican, oblate, Franciscan skeletons. Pluggable calendars. Latin/English/
Spanish/French i18n.

---

## 14. Risks

| Risk | Response |
|---|---|
| iOS web push requires Home Screen install | Explicit onboarding walkthrough; ICS fallback. Native wrapper only if it proves fatal. |
| Copyright on prayer translations | Public domain only; user-pasted text otherwise; legal review before the Little Office ships. |
| Scrupulosity harm | §3 is a design doctrine, not a setting. Scrupulosity mode in v1. A priest reviews the copy. |
| Presuming on the Rule we can't read | Skeleton + user confirmation. Never assert an obligation we haven't verified. |
| Indulgence features becoming a vending machine | Deferred past Phase 4; if built, conditions-checklist framing only, with sources, reviewed by a priest. |
| Scope (this document is large) | Phase 1 is genuinely small and genuinely useful alone. Ship it to yourself before anything else. |

---

## 15. Open questions

1. Can you get the Rule handbook text? It determines the SSPX skeleton's accuracy.
2. Is this for you and your chapter, or a public product? Changes auth, billing, and the
   Phase 4 ordering.
3. Morning/evening prayer — does your Rule specify set texts, or is it open?
4. Does your Rule use the Little Office of the BVM, or Rosary as substitution?
5. Would a priest review the formation and examen copy before launch?
