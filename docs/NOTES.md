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
