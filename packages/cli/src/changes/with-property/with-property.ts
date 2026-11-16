import { default as ts } from 'typescript'

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
  const comma = text.indexOf(',', last.getEnd())
  const hasComma = comma !== -1 && text.slice(last.getEnd(), comma).trim() === ''
  const end = hasComma ? comma + 1 : last.getEnd()
  return `${text.slice(0, end)}${hasComma ? '' : ','}\n${indent}${property},${text.slice(end)}`
}
