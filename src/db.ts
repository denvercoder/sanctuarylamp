import Dexie, { type EntityTable } from 'dexie'
import type { Completion, Profile } from './lib/rule/types'
import type { ExamenEntry, Resolution } from './lib/examen'

/**
 * Local-first storage. IndexedDB is the source of truth on the device.
 *
 * The app must work fully in a chapel basement with no signal, and a server outage must
 * never cost anyone their record. Sync is additive on top of this, never a prerequisite.
 */

type Setting = { key: string; value: unknown }

const db = new Dexie('sanctuarylamp') as Dexie & {
  completions: EntityTable<Completion & { id?: number }, 'id'>
  settings: EntityTable<Setting, 'key'>
  resolutions: EntityTable<Resolution, 'id'>
  examen: EntityTable<ExamenEntry & { id?: number }, 'id'>
}

db.version(1).stores({
  completions: '++id, itemId, date, [itemId+date]',
  settings: 'key',
})

db.version(2).stores({
  completions: '++id, itemId, date, [itemId+date]',
  settings: 'key',
  resolutions: 'id, startedAt',
  examen: '++id, date, resolutionId, [resolutionId+date]',
})

export const DEFAULT_PROFILE: Profile = {
  states: ['lay', 'married', 'parent'],
  stage: 'professed',
  optedIn: [],
  scrupulosityMode: false,
  dayStartsAtMin: 5 * 60, // the day turns at 05:00 local, not midnight — see docs/LAMP.md

  // Per hour, because different offices come from different books in practice.
  books: {
    prime: 'baronius-3vol',
    lauds: 'baronius-3vol',
    compline: 'angelus-2vol',
  },

  // Beyond the Rule. Lauds is not required by the Third Order — the Rule asks for
  // morning and evening prayer, which Prime and Compline discharge — so it lives here
  // as the user's own resolution rather than in the Rule file.
  personalItems: [
    {
      id: 'personal-lauds',
      title: 'Lauds',
      kind: 'resolution',
      cadence: { every: 'day' },
      when: { sun: 'sunrise' },
      prayerId: 'lauds',
    },
  ],
}

export async function loadProfile(): Promise<Profile> {
  const row = await db.settings.get('profile')
  return { ...DEFAULT_PROFILE, ...(row?.value as Partial<Profile> | undefined) }
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.settings.put({ key: 'profile', value: p })
}

export async function loadHistory(): Promise<Completion[]> {
  return db.completions.toArray()
}

/**
 * Record a response to an obligation.
 *
 * `kept`, `excused` and `noted` are the only three, deliberately. There is no "failed",
 * and clearing a mark leaves no trace. See docs/PLAN.md §3.
 */
export async function mark(
  itemId: string, date: string, state: Completion['state'] | null,
): Promise<void> {
  const existing = await db.completions.where({ itemId, date }).first()
  if (state === null) {
    if (existing?.id !== undefined) await db.completions.delete(existing.id)
    return
  }
  if (existing?.id !== undefined) {
    await db.completions.update(existing.id, { state, at: Date.now() })
  } else {
    await db.completions.add({ itemId, date, state, at: Date.now() })
  }
}

export { db }


// ── The particular examen ──────────────────────────────────────────────────────
// Kept local only, and never synced. See docs/PLAN.md §10: the examen is the most
// private thing this app holds, and the simplest way to keep a promise about it is to
// give the server nothing to hold.

export async function loadResolutions(): Promise<Resolution[]> {
  return db.resolutions.toArray()
}

export async function saveResolutions(rs: Resolution[]): Promise<void> {
  await db.transaction('rw', db.resolutions, async () => {
    await db.resolutions.clear()
    await db.resolutions.bulkAdd(rs)
  })
}

export async function loadExamen(): Promise<ExamenEntry[]> {
  return db.examen.toArray()
}

export async function recordExamen(
  resolutionId: string, date: string,
  patch: Partial<Pick<ExamenEntry, 'midday' | 'night' | 'note'>>,
): Promise<void> {
  const existing = await db.examen.where({ resolutionId, date }).first()
  if (existing?.id !== undefined) {
    await db.examen.update(existing.id, patch)
  } else {
    await db.examen.add({ resolutionId, date, ...patch })
  }
}
