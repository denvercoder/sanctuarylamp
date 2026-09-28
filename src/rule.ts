/**
 * The bundled Rule.
 *
 * Authored as YAML at the repo root so a rule is editable without touching code, and so
 * a tertiary of another order can be handed a file rather than a pull request. It is
 * parsed and validated at BUILD time (see the rule-as-json plugin in vite.config.ts), so
 * a malformed rule fails the build and no YAML parser ships to the client.
 */
import { rule as compiled } from 'virtual:sanctuarylamp-rule'
import type { Rule } from './lib/rule/types'

export const rule = compiled as Rule
