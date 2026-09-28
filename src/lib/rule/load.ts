import { parse } from 'yaml'
import type { Rule } from './types'

/**
 * Parse an authored Rule file.
 *
 * Validation is deliberately loud. A Rule is the user's commitment, so a malformed one
 * must fail at load rather than silently drop an obligation — the failure mode we will
 * not accept is an app that quietly stops asking about something the user promised.
 */
/**
 * Cadence keys are whitelisted, for a reason worth recording.
 *
 * `on:` as a cadence key is a trap: YAML 1.1 loaders (PyYAML, many linters and CI tools)
 * read a bare `on` as the boolean `true`, while the YAML 1.2 parser we use here keeps it
 * as the string "on". So a rule file using `on:` parses *differently depending on the
 * tool*, and the failure is silent — the fast list lands under the wrong key and the
 * engine matches no days at all. Hence `onDays`, and hence a whitelist rather than a
 * blocklist, which also catches ordinary typos like `onDay` or `evry`.
 */
const CADENCE_KEYS = new Set(['every', 'count', 'n', 'fallback', 'onDays', 'ongoing'])

function validateCadence(itemId: string, cadence: Record<string, unknown>): void {
  for (const key of Object.keys(cadence)) {
    if (CADENCE_KEYS.has(key)) continue
    if (key === 'on' || key === 'true' || key === 'off' || key === 'false') {
      throw new Error(
        `rule: ${itemId} uses "${key}:" as a cadence key. Use "onDays:" — YAML 1.1 ` +
        `loaders read on/off/yes/no as booleans, so "${key}:" parses differently ` +
        `depending on the tool and silently matches nothing.`,
      )
    }
    throw new Error(
      `rule: ${itemId} has an unknown cadence key "${key}". ` +
      `Expected one of: ${[...CADENCE_KEYS].join(', ')}.`,
    )
  }
  if ('fallback' in cadence && cadence.fallback && typeof cadence.fallback === 'object') {
    validateCadence(`${itemId}.fallback`, cadence.fallback as Record<string, unknown>)
  }
}

export function parseRule(yamlText: string): Rule {
  const raw = parse(yamlText) as unknown
  if (!raw || typeof raw !== 'object') throw new Error('rule: not an object')
  const r = raw as Record<string, unknown>

  for (const key of ['id', 'tradition', 'title', 'edition', 'items'] as const) {
    if (!(key in r)) throw new Error(`rule: missing "${key}"`)
  }
  if (!Array.isArray(r.items)) throw new Error('rule: "items" must be a list')
  if (typeof r.bindingUnderSin !== 'boolean') {
    throw new Error('rule: "bindingUnderSin" must be stated explicitly, true or false')
  }

  const seen = new Set<string>()
  for (const item of r.items as Record<string, unknown>[]) {
    if (typeof item.id !== 'string') throw new Error('rule: an item has no id')
    if (seen.has(item.id)) throw new Error(`rule: duplicate item id "${item.id}"`)
    seen.add(item.id)
    if (typeof item.title !== 'string') throw new Error(`rule: ${item.id} has no title`)
    if (!item.kind || !['obligation', 'counsel', 'resolution'].includes(item.kind as string)) {
      throw new Error(`rule: ${item.id} has an invalid kind`)
    }
    if (!item.cadence || typeof item.cadence !== 'object') {
      throw new Error(`rule: ${item.id} has no cadence`)
    }
    validateCadence(item.id, item.cadence as Record<string, unknown>)
  }

  // Every satisfiedByAny target must exist, or an obligation becomes undischargeable.
  for (const item of r.items as Record<string, unknown>[]) {
    for (const alt of (item.satisfiedByAny as string[] | undefined) ?? []) {
      if (!seen.has(alt)) throw new Error(`rule: ${item.id} points at unknown item "${alt}"`)
    }
    for (const rep of (item.replacedBy as { itemId: string }[] | undefined) ?? []) {
      if (!seen.has(rep.itemId)) {
        throw new Error(`rule: ${item.id} is replaced by unknown item "${rep.itemId}"`)
      }
    }
  }

  return raw as Rule
}

/** Unresolved vagueness in the Rule. The engine may ask; it may not guess. */
export function openQuestions(rule: Rule) {
  return rule.items
    .filter((i) => i.needsUserDecision)
    .map((i) => ({ itemId: i.id, title: i.title, question: i.needsUserDecision! }))
}
