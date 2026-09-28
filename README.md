# Sanctuary Lamp

A rule of life, kept. Built first for Third Order members of the SSPX, and general
enough for any Catholic tertiary or oblate.

> The sanctuary lamp burns before the tabernacle day and night. Nobody scores it.
> Someone tends it.

## Run it

```bash
npm install
npm run dev
```

```bash
npm test
```

## What's here

| Path | |
|---|---|
| `rules/*.yaml` | Authored Rules. Data, not code — a tertiary of another order gets a file, not a pull request. |
| `src/lib/kalendar` | The 1962 Roman Calendar. Pure, UTC, unit-tested. |
| `src/lib/rule` | The Rule engine: date + rule + profile + history → what you owe today. |
| `src/components/Lamp.tsx` | The lamp. Red glass always; brightness from one variable. |
| `docs/` | The plan, the schema, the colour spec, the edition comparison, setup. |

## The short version of the doctrine

There are no streaks. A missed obligation offers *make it up*, *excused*, or *note it*.
The lamp reflects today only — yesterday can neither dim nor brighten it — and its floor
is never dark. It goes out on exactly two days a year, Good Friday and Holy Saturday,
because the tabernacle is empty and the Church puts it out.

This app ships our structured interpretation of a Rule, never the Rule's own text —
see [docs/SOURCES.md](docs/SOURCES.md).

Start with [docs/PLAN.md](docs/PLAN.md).
