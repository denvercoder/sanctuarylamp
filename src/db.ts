import Dexie, { type EntityTable } from 'dexie'
import type { Completion, Profile } from './lib/rule/types'

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
}

db.version(1).stores({
  completions: '++id, itemId, date, [itemId+date]',
  settings: 'key',
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
