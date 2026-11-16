import { default as ts }                from 'typescript'
// --------------------------------------------------------
import type { AddObjectPropertyChange } from '../../commands/command'
import { addedImports }                 from '../added-imports/added-imports'
import type { ChangeOutcome }           from '../change-outcome'
import type { VirtualFiles }            from '../virtual-files/virtual-files'

function objectIn(source: ts.SourceFile, call: string, argument: number): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined
  const visit = (node: ts.Node) => {
    if (found) return
    if (ts.isCallExpression(node) && node.expression.getText(source) === call) {
      const object = node.arguments[argument]
      if (object && ts.isObjectLiteralExpression(object)) found = object
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

const keyOf = (property: ts.ObjectLiteralElementLike) => property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : undefined

function withProperty(text: string, source: ts.SourceFile, object: ts.ObjectLiteralExpression, property: string): string {
  const last = object.properties.at(-1)
  if (!last) return `${text.slice(0, object.getStart(source))}{ ${property} }${text.slice(object.getEnd())}`
  if (!text.slice(object.getStart(source), object.getEnd()).includes('\n')) {
    return `${text.slice(0, last.getEnd())}, ${property}${text.slice(last.getEnd())}`
  }
  const indent = /([ \t]*)$/.exec(text.slice(0, last.getStart(source)))?.[1] ?? ''
  const comma = text.indexOf(',', last.getEnd())
  const hasComma = comma !== -1 && text.slice(last.getEnd(), comma).trim() === ''
  const end = hasComma ? comma + 1 : last.getEnd()
  return `${text.slice(0, end)}${hasComma ? '' : ','}\n${indent}${property},${text.slice(end)}`
}

/** Adds a property to the object a call is given, `eventsOf(bus, { … })`, with its imports; a key it has already is left alone. */
export async function addObjectProperty(change: AddObjectPropertyChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, call, argument, key, value, imports } = change
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const object = objectIn(source, call, argument)
  if (text === null || !object) {
    return { status: 'skipped', note: 'not as newt wrote it', warnings: [`${path} calls no ${call} with an object, so newt did not change it: add ${key}: ${value} to it`] }
  }
  if (object.properties.some(property => keyOf(property) === key)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  await files.write(path, addedImports(withProperty(text, source, object, key === value ? key : `${key}: ${value}`), imports))
  return { status: 'updated', warnings: [] }
}
