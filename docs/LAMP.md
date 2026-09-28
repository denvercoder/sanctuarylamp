# The Lamp, and Recollection

The lamp is not a mascot and not a progress bar. It is the app's one piece of ornament and
it carries the whole doctrine, so its behaviour is specified as tightly as the rule engine.

## What the lamp does

**It burns.** On a day you pray nothing, it burns low and warm. There is no state of the
application in which the lamp is grey, cracked, sad, or extinguished *by the user*. Someone
who returns after eight months away opens the app and the lamp is lit.

There is exactly one exception, and it is the Church's, not ours: the lamp is extinguished
from the Mass of Holy Thursday until the Easter Vigil, because the tabernacle is empty. So
the doctrine is not "the lamp never goes out" but the sharper form —

> **The lamp never goes out because of you.**

A missed Rosary cannot darken it. Only the Triduum can, and then it is relit from new fire.
That is the entire emotional argument of the product, and it is worth more than any feature
in the plan. See [COLOR.md](COLOR.md) for the Triduum sequence.

**It brightens as you pray.** Each obligation kept today raises the glow. Concretely, one
CSS custom property drives everything:

```
--lumen: 0.25 → 1.0     # floor 0.25, never 0
```

`--lumen` scales glow radius, opacity, warmth, and flame amplitude. Nothing else changes —
no colour shifts to green, no badges, no numbers on the lamp.

**It reflects today, not a tally.** `--lumen` is computed from today's kept obligations
only, and it eases back to the floor at the start of the new day. This is the critical
distinction from a streak: the lamp is not a record of your fidelity, it is a picture of
this morning. Yesterday's failure cannot dim today's lamp, and yesterday's fidelity cannot
brighten it either. You tend it daily or not at all, which is what a real sanctuary lamp
demands of a real sacristan.

- Day boundary is configurable, defaulting to the user's wake time rather than midnight.
  (A tertiary praying Compline at 11:40pm should not watch the lamp reset mid-prayer.)
- **Scrupulosity mode:** `--lumen` is pinned at a constant 0.7 and never responds to
  anything. The lamp simply burns. No feedback, no inference, nothing to read into.

**Its glass is red. Always.** The red glass is what makes a sanctuary lamp a sanctuary lamp,
so it is not a theme slot and it never takes the liturgical colour. The day's colour is
carried by the ribbon, the frontal and the chip instead — see [COLOR.md](COLOR.md).

## Where it lives

**Landing.** The lamp is the hero: large, centred, above the fold, with the day named
beneath it in small caps — *Ember Wednesday · Feria of Advent · violet* — and the day's
obligations below that. The first thing you see on opening the app is a flame and the
liturgical day, not a dashboard. Chrome is minimal and brass-hairlined; nothing competes
with the flame.

**Full screen.** Tap the lamp and it fills the screen. This is the entry to Recollection.

## Recollection

The stripped, full-screen prayer mode. The Catholic word is exact — *recollection* is the
gathering of the soul inward and the shedding of distraction, and a "day of recollection"
is already a practice in this Rule's world, so the name needs no explanation to the
audience. The button reads **Enter recollection**.

What it does:

- Full-screen lamp on near-black. Everything else goes: navigation, header, counters,
  timers-as-numbers, any element with a count in it.
- **One thing at a time.** The prayer text if the item has one, set in Cardo with generous
  measure and rubrics in red, scrolling slowly under the thumb. Otherwise nothing but the
  flame.
- **No visible controls.** A tap anywhere reveals a single hairline row — *done*, *exit* —
  which fades after three seconds. Nothing else is reachable without leaving.
- **Notifications suppressed** for the duration, including our own bells. The app will not
  interrupt you praying because the app told you to pray.
- **Screen stays awake** (Screen Wake Lock API), because a phone that sleeps during the
  third decade is a small betrayal.
- **Timed items** (the fifteen minutes of meditation) show no countdown — a countdown is an
  invitation to watch a clock. The flame slowly grows over the interval instead, and a
  single bronze bell marks the end.
- **Exit is never punished.** Leaving Recollection at four minutes of fifteen records
  nothing negative and says nothing at all.

It should be genuinely usable as the thing you look at while praying in a dark church at
5:40 in the morning, which is also why the default theme is dark and the light theme is
the exception.

## Implementation

Inline SVG plus CSS, no canvas, no WebGL, no animation library.

- Flame: three layered radial gradients (core, halo, bloom) with `mix-blend-mode: screen`,
  animated by two long-period keyframes at different rates so the flicker never visibly
  loops. Total cost: a few composited layers, no JS per frame.
- `@media (prefers-reduced-motion: reduce)` → flicker off, steady glow. The lamp must still
  read as *lit*, so reduce amplitude to zero rather than hiding the animation's effect.
- The glass, chain, and bracket are a single hand-drawn SVG path set, red glass over brass,
  styled by CSS variables so the seasonal colour is one property change.
- `--lumen` is written to `:root` by one small hook. It is the only channel between app
  state and the lamp, which keeps the doctrine enforceable in one place — and reviewable.
- Must render at 60fps on a five-year-old Android phone in a chapel basement on no signal.
