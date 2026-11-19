import { default as ts }                from 'typescript'
// --------------------------------------------------------
import type { AddObjectPropertyChange } from '../../commands/command'
import { addedImports }                 from '../added-imports/added-imports'
import type { ChangeOutcome }           from '../change-outcome'
import { propertyKey }                  from '../property-key/property-key'
import type { VirtualFiles }            from '../virtual-files/virtual-files'
import { withProperty }                 from '../with-property/with-property'

type Found = { call: ts.CallExpression, object: ts.ObjectLiteralExpression | undefined }

function callIn(source: ts.SourceFile, call: string, argument: number): Found | undefined {
  let found: Found | undefined
  const visit = (node: ts.Node) => {
    if (found) return
    if (ts.isCallExpression(node) && node.expression.getText(source) === call) {
      const object = node.arguments[argument]
      if (!object || ts.isObjectLiteralExpression(object)) found = { call: node, object }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

/** Adds a property to the object a call is given, `eventsOf(bus, { … })`, with its imports; a key it has already is left alone. */
export async function addObjectProperty(change: AddObjectPropertyChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, call, argument, key, value, imports, createArgument } = change
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const found = callIn(source, call, argument)
  const object = found?.object
  const creatable = found && !object && createArgument && found.call.arguments.length === argument
  if (text === null || (!object && !creatable)) {
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} calls no ${call} with an object, so newt did not change it: add ${key}: ${value} to it`] }
  }
  const property = key === value ? key : `${key}: ${value}`
  if (object?.properties.some(each => propertyKey(each) === key)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const last = found!.call.arguments.at(-1)
  const at = last ? last.getEnd() : found!.call.getEnd() - 1
  const indent = /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', at) + 1))![0]
  const created = `{\n${indent}  ${property},\n${indent}}`
  const edited = object ? withProperty(text, source, object, property) : `${text.slice(0, at)}${last ? ', ' : ''}${created}${text.slice(at)}`
  await files.write(path, addedImports(edited, imports))
  return { status: 'updated', warnings: [] }
}
