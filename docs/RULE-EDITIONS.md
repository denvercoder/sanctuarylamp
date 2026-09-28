# Rule editions: 1980/2013 US vs 2024 Canada

Two editions of the *same* Rule of the Third Order of the SSPX, both signed by Archbishop
Marcel Lefebvre. They are not identical, and the differences land exactly on the parts an
app has to automate — which days you fast, and what satisfies the daily obligation.

- **US District** — *Sursum Corda* No. 4, Winter 2013, reprinting the Rule as promulgated
  **November 1, 1980**. This is the edition the user is professed under. **Normative.**
- **Canada District** — *Third Order Handbook*, © 2024, Christ the King Priory, Langley BC.
  The same Rule with pastoral updates, plus the full practical apparatus (Prime, Compline,
  a meditation method, alternate morning/evening prayers, the Formula for Reception of
  Postulants, the Profession ceremony, and an Examination of Conscience keyed to the Rule).

## Identical in both

Purpose, patron, and relationship to the Society; eligibility, including children from
twelve with their parents' permission; the emblems given at profession; the description of
the Third Order's spirit; the three steps of membership, with a one-year postulancy; the
daily Rosary; weekly attendance at Mass in the traditional rite and explicitly not the new
rite; confession on a fortnightly aim with a monthly floor; a retreat every two years; the
recommended reading list; Friday abstinence; abstention from television and from indecent
reading, and the practice of sobriety; the obligations of the married; professional and
social duties; and the section on how the Order is organised.

## Where they differ

Described rather than quoted — see the sources below for the texts themselves.

| | **1980 / 2013 US** (yours) | **2024 Canada** |
|---|---|---|
| Daily, in place of Mass | Fifteen minutes of **meditation** — a named discipline | A quarter hour of **prayer** — broader and less specific |
| Fast days | Ember Days, Ash Wednesday, **Holy Saturday**, and the vigils of great feasts, **left unenumerated** | Ember Days, Ash Wednesday, **Good Friday**, and **three named vigils** — Pentecost, All Saints, Christmas |
| Priests' extra fasts | Not mentioned | Lenten Fridays and 7 December, for Society priests |
| Abstinence | All Fridays | All Fridays, with Ash Wednesday named as well and abstinence recommended on the fast days |
| Mortification | Television, indecent reading, sobriety | The same three, plus **internet and electronic media** |
| Married | Television and unclean magazines named among things to avoid | Adds unrestricted internet access |
| Apparatus | The Rule alone, with Lefebvre's early-1980s articles on the Society's spirit | The Rule plus Prime, Compline, a method for meditation, alternative morning and evening prayers, the reception formula, the profession ceremony, and an **examination of conscience keyed to the Rule** |

### The two fasting divergences, in detail

**1. Holy Saturday against Good Friday.** Your edition names Holy Saturday. That reflects
the older discipline: Good Friday's fast bound every Catholic under general law, so the
Rule was naming the *additional* day rather than restating the obvious. The 2024 edition
substitutes Good Friday. Practically you keep both — Good Friday is not optional for
anyone, and your edition asks for Holy Saturday on top of it.

**2. Your edition does not say which vigils.** This is the one place the text cannot be
mechanised without a decision, and the app must ask rather than guess. Under the 1962
calendar there are four fasting vigils — Christmas, Pentecost, the Assumption and All
Saints — and the 2024 edition names only three, dropping the Assumption. Resolved in
`rules/sspx-third-order.us-1980.yaml` to all four, at the user's direction, with a comment
recommending he confirm it with his chaplain.

## Verdict

The 2013 US text is the better **norm** — it is the original 1980 promulgation, it is what
the user professed under, and its wording is the more exact of the two. The 2024 handbook
is the better **apparatus** — it is where Prime, Compline, the meditation method, and the
examen actually live.

So the app treats them as what they are: one Rule, two editions.

- **Normative edition:** 1980/2013 US. Generates the obligations.
- **Reference edition:** 2024 CA. Supplies the examen and, clearly labelled, optional
  counsels and interpretations.
- Never silently merged. Anything not from the normative edition is tagged `fromEdition`
  and stays off until the user opts in.

This is why `Rule` carries an `edition`. No prayer app has had a "which edition of your
rule are you under" concept, and comparing these two proved it was needed.

## Copyright

See [SOURCES.md](SOURCES.md) for what this project reproduces and what it does not.
