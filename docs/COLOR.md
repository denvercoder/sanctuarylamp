# Colour: the lamp is red, the ribbon is not

## The correction

The sanctuary lamp burns behind **red glass**. Always. It is the lamp's defining
characteristic and it is not a theme slot. Earlier drafts had the glass taking the
liturgical colour of the day; that was wrong and it is removed. Red glass, brass fittings,
in every season, forever.

## Where the liturgical colour goes instead

Three carriers, each one an authentic object rather than an invented UI accent.

**1. The ribbon.** A missal or breviary is marked with silk ribbons, and the ribbon for the
day is the day's colour. So: a single 3px ribbon running down the left edge of the day's
page, in the day's colour, with a slight taper and shadow where it crosses the gutter. It
is thin, it is unmistakable, it never competes with the flame, and any Catholic who has
held a hand missal recognises it instantly. This is the primary carrier.

**2. The frontal.** The altar frontal — the antependium — is the large cloth that actually
changes colour in a church through the year. The lamp hangs *before* something, so the
hero's lower band is a low-saturation wash of the day's colour, like light falling on the
frontal beneath. Kept to roughly 12–18% saturation so the red flame stays dominant. This
is the atmospheric carrier: you feel Lent before you read the word "Lent".

**3. The chip.** A small filled roundel beside the day's name in the header, exactly as an
ordo prints it: `● Ember Wednesday · Feria of Advent`. This is the informational carrier —
unambiguous, screen-reader-labelled, and useful.

Colour also stays on the fidelity grid (§3 of the plan), where each day's cell is tinted by
its liturgical colour. Over a year it reads as a stained-glass window, and it is the one
place a *sequence* of colours is the point.

Colour never touches: the lamp glass, the flame, the brass, body text, or any success state.
There are no green checkmarks in this application.

## The 1962 palette, not the modern one

Per the 1962 rubrics, which differ from the post-conciliar scheme in ways this audience
will notice immediately.

```
white    #F2EAD8   Easter, Christmas, Our Lord, Our Lady, confessors, virgins
red      #8E2B20   Pentecost, martyrs, Apostles, Holy Cross
green    #3F5E4A   Time after Epiphany, Time after Pentecost
violet   #4B2E5A   Advent, Septuagesima, Lent, Passiontide, Rogations, Ember Days, vigils
black    #14110F   Good Friday, All Souls, Requiems
rose     #C98B9B   Gaudete (Advent III) and Laetare (Lent IV) only
gold     #B08D57   permitted substitute for white, red, or green — never for violet or black
```

Deliberate 1962 behaviours:

- **Septuagesima, Sexagesima and Quinquagesima are violet.** There is no such season in the
  modern calendar, and getting this right is a strong signal that the calendar engine is
  actually a 1962 engine and not a modern one with the names changed.
- **Black on Good Friday and All Souls**, where the modern books use red and violet.
- **No blue.** It was never generally approved, and its absence is a correctness marker.
- **Vigils and Ember Days are violet**, which matters because your Rule's fast days are
  precisely these — so the fast days will *look* penitential without the app saying so.
- Gold may substitute for white, red, or green but never for violet or black. Modelled as a
  user preference on feasts of the first and second class.

## Good Friday and Holy Saturday: the lamp is out

The tabernacle is empty from the Mass of Holy Thursday until the Easter Vigil, and the
sanctuary lamp is extinguished with it. The app follows the Church.

- **Holy Thursday**, after the evening Mass: the flame gutters and goes out. `--lumen: 0`.
- **Good Friday and Holy Saturday**: black. Empty glass, cold brass, no glow. The app says
  almost nothing — the day's obligations are still listed, quietly, in white on black, with
  no lamp above them. The fidelity grid, the counters, the chip: all suppressed.
- **The Easter Vigil**: the flame returns. Not a fade — a strike, from a single point of new
  fire, then it grows. Gold frontal, white ribbon. It should be the most beautiful thing
  the app does all year, and it should arrive without warning or announcement.

This does not weaken the doctrine of [LAMP.md](LAMP.md), it sharpens it:

> **The lamp never goes out because of you.**
> It goes out only when the Church puts it out, and then it is relit.

A missed Rosary cannot darken the lamp. Only the Triduum can. That is the whole argument of
the product in two sentences, and it happens to be liturgically correct.
