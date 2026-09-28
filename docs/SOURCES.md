# Sources and what this project reproduces

## The policy

**Sanctuary Lamp ships our structured interpretation of a Rule, not the Rule's text.**

What that means concretely, in `rules/*.yaml`:

- **Item titles are our own plain descriptions** of what binds — not the Rule's wording.
- **`text:` fields are empty.** The Rule's own text is not reproduced. A user who wants it
  in the app pastes their own copy, from their own handbook.
- **Structure is ours**: cadences, calendar predicates, states of life, formation stages,
  and the alternatives that discharge an obligation. That is analysis of the document, not
  a copy of it.
- **`docs/RULE-EDITIONS.md` describes the differences between editions** rather than
  quoting them.

Facts about a document — that one edition names Holy Saturday and another names Good
Friday — are not the document. Structure and analysis are our work. The text is not.

## The one exception

**The examination-of-conscience prompts are carried verbatim**, on the project owner's
explicit instruction, recorded here so the decision is traceable rather than accidental.
They appear as `examenQuestion` on 14 items in the SSPX rule file.

For the record, since the instruction rested on the premise that Church texts are not
copyrighted: they generally are. The 2024 Canadian handbook carries an explicit copyright
notice. Libreria Editrice Vaticana holds and has enforced copyright on papal documents.
Modern liturgical translations — ICEL, the Grail Psalms — are licensed commercially. Texts
like the Douay-Rheims are free because of their age, not their subject.

The practical exposure is small: this serves the members of the society that published the
handbook, non-commercially. But "small" is not "none", and the fix is one email.

## Why this stays small

The app does not reproduce the office. Prime and Compline are prayed from the user's own
Roman Breviary, in print — see [PLAN.md](PLAN.md) §8. That decision removes the entire
translation-licensing question before it starts: there is no ICEL text, no Grail Psalter,
no breviary translation anywhere in this project, and no permission on which shipping
depends.

What remains is the Rule's structure, which is our analysis, and the examen prompts, which
are the one deliberate exception above. A courtesy note to the Third Order chaplain of the
US District (Blessed Virgin Mary Mother of God Priory, 2656 Warners Road, Warners, NY
13164) would settle even that, but nothing is blocked on it.

## Sources consulted

| Document | Publisher | Use |
|---|---|---|
| *Sursum Corda* no. 4, Winter 2013 — the Rule as promulgated 1 Nov 1980 | SSPX US District | **Normative.** Structure of `rules/sspx-third-order.us-1980.yaml`. |
| *Third Order Handbook*, © 2024 | SSPX Canada, Christ the King Priory | Reference: edition comparison and examen prompts. Its prayer texts are **not** used. |
| 1917 Code of Canon Law, c. 1252 §2 | public domain | The four fasting vigils. |
| 1962 rubrics / Code of Rubrics 1960 | — | Seasons, ranks, and colours in `src/lib/kalendar`. |

Liturgical calendar computations are mathematics and public-domain rubrics; nothing in
`src/lib/kalendar` derives from a copyrighted text.
