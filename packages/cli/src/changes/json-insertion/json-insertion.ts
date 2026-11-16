import { default as ts } from 'typescript'
// --------------------------------------------------------
import type { TextEdit } from '../applied-edits/applied-edits'

type Container = ts.ObjectLiteralExpression | ts.ArrayLiteralExpression

/** The edit that adds entries at the end of an object or an array of a JSON file, laid out as it is: one per line, or on its line. */
export function jsonInsertion(text: string, source: ts.SourceFile, container: Container, entries: string[], unit: string): TextEdit {
  const items: readonly ts.Node[] = ts.isObjectLiteralExpression(container) ? container.properties : container.elements
  const start = container.getStart(source)
  const end = container.getEnd()
  const multiline = text.slice(start, end).includes('\n')
  const closing = /([ \t]*)\S?$/.exec(text.slice(0, end - 1))?.[1] ?? ''
  const last = items.at(-1)
  if (!last) {
    const inside = multiline ? `\n${closing}${unit}${entries.join(`,\n${closing}${unit}`)}\n${closing}` : entries.join(', ')
    return { from: start + 1, to: end - 1, text: inside }
  }
  const comma = text.indexOf(',', last.getEnd())
  const trailing = comma !== -1 && comma < end - 1 && text.slice(last.getEnd(), comma).trim() === ''
  const at = trailing ? comma + 1 : last.getEnd()
  if (!multiline) {
    return { from: at, to: at, text: `${trailing ? ' ' : ', '}${entries.join(', ')}${trailing ? ',' : ''}` }
  }
  const indent = /([ \t]*)$/.exec(text.slice(0, last.getStart(source)))?.[1] ?? `${closing}${unit}`
  return { from: at, to: at, text: `${trailing ? '' : ','}\n${indent}${entries.join(`,\n${indent}`)}${trailing ? ',' : ''}` }
}
