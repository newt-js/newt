import { default as ts } from 'typescript'
// --------------------------------------------------------
import { endOfLine }     from '../end-of-line/end-of-line'

/** `text` with a property added at the end of an object, on its line or on one of its own, as the object is written. */
export function withProperty(text: string, source: ts.SourceFile, object: ts.ObjectLiteralExpression, property: string): string {
  const start = object.getStart(source)
  const multiline = text.slice(start, object.getEnd()).includes('\n')
  const last = object.properties.at(-1)
  if (!last) {
    if (!multiline) return `${text.slice(0, start)}{ ${property} }${text.slice(object.getEnd())}`
    const indent = /([ \t]*)\}$/.exec(text.slice(0, object.getEnd()))?.[1] ?? ''
    return `${text.slice(0, start)}{\n${indent}  ${property},\n${indent}}${text.slice(object.getEnd())}`
  }
  if (!multiline) {
    return `${text.slice(0, last.getEnd())}, ${property}${text.slice(last.getEnd())}`
  }
  const indent = /([ \t]*)$/.exec(text.slice(0, last.getStart(source)))?.[1] ?? ''
  const { at, comma } = endOfLine(text, last.getEnd())
  if (text[at] !== '\n') {
    // The object closes on its last property's line: the new one goes before the close, as the last.
    const closing = object.getEnd() - 1
    const before = text.slice(0, closing).replace(/[ \t]*$/, '')
    return `${before}${before.endsWith(',') ? '' : ','}\n${indent}${property} ${text.slice(closing)}`
  }
  const withComma = comma ? text.slice(0, at) : `${text.slice(0, last.getEnd())},${text.slice(last.getEnd(), at)}`
  return `${withComma}\n${indent}${property},${text.slice(at)}`
}
