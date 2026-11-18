import { default as ts }         from 'typescript'
// --------------------------------------------------------
import type { WireModuleChange } from '../../commands/command'
import { addedImports }          from '../added-imports/added-imports'
import type { ChangeOutcome }    from '../change-outcome'
import { propertyKey }           from '../property-key/property-key'
import type { VirtualFiles }     from '../virtual-files/virtual-files'
import { withProperty }          from '../with-property/with-property'

type Modules = { statements: ts.NodeArray<ts.Statement>, returned: ts.ReturnStatement, object: ts.ObjectLiteralExpression }

function modulesIn(source: ts.SourceFile, functionName: string): Modules | undefined {
  for (const statement of source.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.body || statement.name?.text !== functionName) continue
    const returned = statement.body.statements.find(ts.isReturnStatement)
    // What it returns, or what it hands the call it returns: `defineFeature('…', base, { … })`.
    const object = returned?.expression && (ts.isCallExpression(returned.expression) ? returned.expression.arguments.find(ts.isObjectLiteralExpression) : returned.expression)
    if (returned && object && ts.isObjectLiteralExpression(object)) {
      return { statements: statement.body.statements, returned, object }
    }
  }
  return undefined
}

const declares = (statement: ts.Statement, name: string) =>
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(each => ts.isIdentifier(each.name) && each.name.text === name)

/** Declares a module in <feature>.feature.ts (a feature in <ctx>-features.ts), in its function before what it returns, and adds it to the object it returns: both, or nothing. */
export async function wireModule({ path, functionName, module, declaration, imports }: WireModuleChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const found = modulesIn(source, functionName)
  if (text === null || !found) {
    const what = [...imports, declaration.trim(), `${module} in the object it returns`].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} is not as newt wrote it, so newt did not change it: add ${what}`] }
  }
  const declared = found.statements.some(each => declares(each, module))
  const listed = found.object.properties.some(each => propertyKey(each) === module)
  if (declared && listed && addedImports(text, imports) === text) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  let edited = listed ? text : withProperty(text, source, found.object, module)
  if (!declared) {
    const lineStart = text.lastIndexOf('\n', found.returned.getStart(source)) + 1
    const indent = text.slice(lineStart, found.returned.getStart(source))
    edited = `${edited.slice(0, lineStart)}${indent}${declaration.trim()}\n${edited.slice(lineStart)}`
  }
  await files.write(path, addedImports(edited, imports))
  return { status: 'updated', warnings: [] }
}
