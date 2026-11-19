import { default as ts }      from 'typescript'
// --------------------------------------------------------
import type { ChangeOutcome } from '../change-outcome'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

type Initialized = { statement: ts.VariableStatement, name: string, uses: string[] }

/** A module's initialize, `Order_Module.initialize`, or the open of a context, `Auth_Context.open`. */
const builds = (callee: string) => callee.endsWith('_Module.initialize') || callee.endsWith('_Context.open')

/** What a property hands over: a module by its name, `user`, or a context opened before, `auth.context`. */
function handed(property: ts.ObjectLiteralElementLike): string[] {
  if (ts.isShorthandPropertyAssignment(property)) return [property.name.text]
  if (!ts.isPropertyAssignment(property)) return []
  const value = property.initializer
  if (ts.isIdentifier(value)) return [value.text]
  const opened = ts.isPropertyAccessExpression(value) && value.name.text === 'context' && ts.isIdentifier(value.expression)
  return opened ? [value.expression.text] : []
}

function initializedIn(source: ts.SourceFile): Initialized[] {
  const found: Initialized[] = []
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) {
      const [declaration] = node.declarationList.declarations
      const initializer = declaration?.initializer
      const call = initializer && ts.isAwaitExpression(initializer) ? initializer.expression : initializer
      if (declaration && ts.isIdentifier(declaration.name) && call && ts.isCallExpression(call) && builds(call.expression.getText(source))) {
        const deps = call.arguments[2]
        const uses = deps && ts.isObjectLiteralExpression(deps) ? deps.properties.flatMap(handed) : []
        found.push({ statement: node, name: declaration.name.text, uses })
      }
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function sorted(modules: Initialized[]): Initialized[] {
  const byName = new Map(modules.map(each => [each.name, each]))
  const result: Initialized[] = []
  const visit = (module: Initialized, path: Set<string>) => {
    if (result.includes(module) || path.has(module.name)) return
    path.add(module.name)
    for (const name of module.uses) {
      const used = byName.get(name)
      if (used) visit(used, path)
    }
    result.push(module)
  }
  for (const module of modules) visit(module, new Set())
  return result
}

/** Puts the modules <ctx>.context.ts initializes, or the contexts contexts.ts and a test open, in an order where each comes after the ones it uses. */
export async function orderModules(path: string, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const modules = initializedIn(source)
  const order = sorted(modules)
  if (text === null || order.every((each, at) => each === modules[at])) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  // A statement moves with the comments above it.
  const startOf = (statement: ts.Statement) => ts.getLeadingCommentRanges(text, statement.getFullStart())?.[0]?.pos ?? statement.getStart(source)
  let edited = text
  for (let at = modules.length - 1; at >= 0; at--) {
    const slot = modules[at]!.statement
    const moved = order[at]!.statement
    edited = `${edited.slice(0, startOf(slot))}${text.slice(startOf(moved), moved.getEnd())}${edited.slice(slot.getEnd())}`
  }
  await files.write(path, edited)
  return { status: 'updated', warnings: [] }
}
