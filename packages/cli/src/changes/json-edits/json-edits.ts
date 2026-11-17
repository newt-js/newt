import { default as ts } from 'typescript'
// --------------------------------------------------------
import type { TextEdit } from '../applied-edits/applied-edits'
import { jsonInsertion } from '../json-insertion/json-insertion'
import { jsonValue }     from '../json-value/json-value'
import { propertyKey }   from '../property-key/property-key'

export type JsonEdits = { edits: TextEdit[], conflicts: string[] }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function written(value: unknown, indent: string, unit: string): string {
  return JSON.stringify(value, null, unit).split('\n').join(`\n${indent}`)
}

/** The edits that add to a JSON node what `wanted` has and it lacks, and the values it has that differ from `wanted`'s. */
export function jsonEdits(text: string, source: ts.SourceFile, node: ts.Expression, wanted: unknown, unit: string, at = ''): JsonEdits {
  if (ts.isObjectLiteralExpression(node) && isRecord(wanted)) {
    const indent = `${/([ \t]*)\S?$/.exec(text.slice(0, node.getEnd() - 1))?.[1] ?? ''}${unit}`
    const missing: string[] = []
    const result: JsonEdits = { edits: [], conflicts: [] }
    for (const [key, want] of Object.entries(wanted)) {
      const property = node.properties.find((each): each is ts.PropertyAssignment => ts.isPropertyAssignment(each) && propertyKey(each) === key)
      if (!property) {
        missing.push(`${JSON.stringify(key)}: ${written(want, indent, unit)}`)
        continue
      }
      const inner = jsonEdits(text, source, property.initializer, want, unit, at ? `${at}.${key}` : key)
      result.edits.push(...inner.edits)
      result.conflicts.push(...inner.conflicts)
    }
    if (missing.length > 0) result.edits.push(jsonInsertion(text, source, node, missing, unit))
    return result
  }
  if (ts.isArrayLiteralExpression(node) && Array.isArray(wanted)) {
    const indent = `${/([ \t]*)\S?$/.exec(text.slice(0, node.getEnd() - 1))?.[1] ?? ''}${unit}`
    const present = node.elements.map(each => jsonValue(text, each, source))
    const missing = wanted.filter(item => !present.some(each => same(each, item)))
    return { edits: missing.length === 0 ? [] : [jsonInsertion(text, source, node, missing.map(item => written(item, indent, unit)), unit)], conflicts: [] }
  }
  const current = jsonValue(text, node, source)
  return same(current, wanted) ? { edits: [], conflicts: [] } : { edits: [], conflicts: [`${at} is ${JSON.stringify(current)}, newt's is ${JSON.stringify(wanted)}`] }
}
