# The Rule Engine schema

One engine, any Catholic third order. The SSPX Third Order is the first template, not the
model the schema was built around — everything below was checked against Discalced
Carmelite (OCDS), Dominican laity, Benedictine oblate, and Secular Franciscan (OFS)
practice, because those four break a naive design in four different ways.

Guiding principle, straight from the source: the chaplain of the US District writes that
"it was the wish of the Archbishop to make this program simple and easy, not creating
unreasonable burdens or obstacles for the laity." **The engine must never render a Rule
heavier than its author wrote it.** No invented sub-tasks, no completion percentages, no
obligations the text doesn't contain.

## Types

```ts
type Rule = {
  id: string;
  tradition: TraditionId;          // 'sspx-third-order' | 'ocds' | 'op-laity' | 'osb-oblate' | 'ofs' | 'custom'
  title: string;
  edition: Edition;                // which printing the user is actually under — see RULE-EDITIONS.md
  authority?: string;              // "+Marcel Lefebvre, November 1, 1980"
  bindingUnderSin: boolean;        // most third-order rules do NOT bind under sin. Shown as a rubric.
  minimumAge?: number;
  formation: FormationStage[];
  items: RuleItem[];
  community?: CommunityObligation[];
};

type Edition = {
  id: string;                      // 'us-1980'
  label: string;                   // '1980 promulgation, US District (Sursum Corda no. 4, 2013)'
  normative: boolean;              // exactly one edition is normative; others are reference
  source?: string;                 // URL or citation
};

type RuleItem = {
  id: string;
  title: string;
  text?: string;                   // verbatim Rule wording, if we have the right to store it
  kind: 'obligation' | 'counsel' | 'resolution';
  cadence: Cadence;
  satisfiedByAny?: string[];       // ids of alternatives — ANY one discharges the item
  appliesTo?: StateOfLife[];       // 'lay' | 'priest' | 'married' | 'single' | 'parent'
  stage?: FormationStageId[];      // only binds during these formation stages
  onlyIf?: CalendarPredicate[];
  replacedBy?: { when: CalendarPredicate; itemId: string }[];
  when?: TimeAnchor;
  durationMin?: number;
  prayerId?: string;
  examenQuestion?: string;         // the Rule's OWN examen question, if it has one
  fromEdition?: string;            // set when the item is NOT from the normative edition
  needsUserDecision?: string;      // the text is vague; ask, never guess. See below.
};

type Cadence =
  | { every: 'day' }
  | { every: 'week'; count?: number }              // count: times per week
  | { every: 'weeks'; n: 2; fallback?: Cadence }   // "every two weeks, or at least monthly"
  | { every: 'month' } | { every: 'months'; n: number }
  | { every: 'year' }  | { every: 'years'; n: number }
  | { onDays: CalendarPredicate[] }                    // fasts: no recurrence, only calendar
  | { ongoing: true };                             // a standing disposition, not a task

type TimeAnchor =
  | { clock: string }                              // '06:00'
  | { sun: 'dawn' | 'sunrise' | 'noon' | 'sunset' | 'dusk'; offsetMin?: number }
  | { office: 'prime' | 'compline' };
```

## Five things that break a naive design, and how each is handled

**1. Alternatives (`satisfiedByAny`).** Your daily item is "Attendance at the Immemorial
Mass, **if possible, or** fifteen minutes of meditation." That is not two tasks and not one
task with a note — it is one obligation with two discharges, and the UI must show it as a
single line that either route satisfies. OFS has the same shape ("Liturgy of the Hours, or
other forms of prayer"). Without this the app manufactures a guilt it has no right to.

**2. Degrading cadence (`fallback`).** "Every two weeks, if possible, or at least once a
month." Two thresholds: the aim and the floor. The app tracks the aim and only flags the
floor. Most rules have at least one item like this and every habit tracker gets it wrong.

**3. State of life (`appliesTo`).** The married obligations bind only the married; the 2024
edition's extra fasts bind only Society priests; OCDS scapular provisions depend on
promise status. One Rule, different bodies of obligation per member.

**4. Formation stages (`stage`).** Postulancy is one year and its obligations are tested,
not assumed. Generalises cleanly: OCDS aspirancy → first promise → definitive promise;
OP inquirer → novice → temporary → perpetual profession; OFS inquiry → candidacy →
profession; oblate novice → final oblation. Each stage carries a duration, required
reading, and a real date, so *"your profession falls due in March"* is computable.

```ts
type FormationStage = {
  id: string; label: string;        // 'postulancy' | 'Postulancy'
  durationMonths?: number;          // 12
  requires?: string[];              // reading, interview, retreat
  concludesWith?: string;           // 'Profession — medal, crucifix, certificate'
};
```

**5. Calendar predicates (`onlyIf`, `on`).** The obligations change with the day, so the
engine evaluates against `@sanctuarylamp/kalendar`:

```
season:advent | septuagesima | lent | passiontide | paschaltide | after-pentecost
day:ember-wednesday | ember-friday | ember-saturday | rogation
day:ash-wednesday | good-friday | holy-saturday
day:vigil-of:<feast> | day:first-friday | day:first-saturday | day:friday | day:sunday
rank:<=2 | feast:<id> | octave:all-souls
```

## Vagueness is a first-class state

`needsUserDecision` exists because your edition says "Vigils of **great feasts**" without
saying which. An app that silently picks a list is lying to its user about their Rule. So
the item is stored unresolved, onboarding asks, both editions' wording is shown, and the
answer is recorded as *the user's* interpretation — revisable after they ask their
chaplain. **The engine may ask. It may not guess.**

## Non-goals

- The engine does not judge. Nothing computes a "score", a percentage, or a grade.
- The engine does not invent. If an obligation is not in the text, it does not exist.
- The engine does not bind under sin when the Rule doesn't, and it says so in a red rubric
  on the Rule screen. For most third orders — including this one — that rubric matters
  more than any feature in this document.
