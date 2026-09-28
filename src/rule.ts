import ruleYaml from '../rules/sspx-third-order.us-1980.yaml?raw'
import { parseRule } from './lib/rule/load'

/**
 * The bundled Rule.
 *
 * Authored as YAML at the repo root so a rule is editable without touching code, and so
 * a tertiary of another order can be handed a file rather than a pull request.
 */
export const rule = parseRule(ruleYaml)
