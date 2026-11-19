import { default as ts } from 'typescript'
// --------------------------------------------------------
import { endOfLine }     from '../end-of-line/end-of-line'

/** `text` with the object on one line, `{ a, b }`, or on lines of its own when that line would pass 80 characters. */
function inline(text: string, start: number, end: number, properties: string[]): string {
  const one = `${text.slice(0, start)}{ ${properties.join(', ')} }${text.slice(end)}`
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const lineEnd = one.indexOf('\n', start)
  if ((lineEnd === -1 ? one.length : lineEnd) - lineStart <= 80) return one
  const indent = /^[ \t]*/.exec(text.slice(lineStart))![0]
  const lines = properties.map(each => `${indent}  ${each},\n`).join('')
  return `${text.slice(0, start)}{\n${lines}${indent}}${text.slice(end)}`
}

/** `text` with a property added at the end of an object, on its line or on one of its own, as the object is written. */
export function withProperty(text: string, source: ts.SourceFile, object: ts.ObjectLiteralExpression, property: string): string {
  const start = object.getStart(source)
  const multiline = text.slice(start, object.getEnd()).includes('\n')
  const last = object.properties.at(-1)
  if (!last) {
    if (!multiline) return inline(text, start, object.getEnd(), [property])
    const indent = /([ \t]*)\}$/.exec(text.slice(0, object.getEnd()))?.[1] ?? ''
    return `${text.slice(0, start)}{\n${indent}  ${property},\n${indent}}${text.slice(object.getEnd())}`
  }
  if (!multiline) {
    const properties = object.properties.map(each => each.getText(source))
    return inline(text, start, object.getEnd(), [...properties, property])
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
