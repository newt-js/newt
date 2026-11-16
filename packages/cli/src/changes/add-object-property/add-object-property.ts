import { default as ts }                from 'typescript'
// --------------------------------------------------------
import type { AddObjectPropertyChange } from '../../commands/command'
import { addedImports }                 from '../added-imports/added-imports'
import type { ChangeOutcome }           from '../change-outcome'
import { propertyKey }                  from '../property-key/property-key'
import type { VirtualFiles }            from '../virtual-files/virtual-files'
import { withProperty }                 from '../with-property/with-property'

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

/** Adds a property to the object a call is given, `eventsOf(bus, { … })`, with its imports; a key it has already is left alone. */
export async function addObjectProperty(change: AddObjectPropertyChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, call, argument, key, value, imports } = change
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const object = objectIn(source, call, argument)
  if (text === null || !object) {
    return { status: 'skipped', note: 'not as newt wrote it', warnings: [`${path} calls no ${call} with an object, so newt did not change it: add ${key}: ${value} to it`] }
  }
  if (object.properties.some(property => propertyKey(property) === key)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  await files.write(path, addedImports(withProperty(text, source, object, key === value ? key : `${key}: ${value}`), imports))
  return { status: 'updated', warnings: [] }
}
