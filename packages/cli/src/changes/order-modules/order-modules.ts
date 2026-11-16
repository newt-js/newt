import { default as ts }      from 'typescript'
// --------------------------------------------------------
import type { ChangeOutcome } from '../change-outcome'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

type Initialized = { statement: ts.VariableStatement, name: string, uses: string[] }

function initializedIn(source: ts.SourceFile): Initialized[] {
  const found: Initialized[] = []
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) {
      const [declaration] = node.declarationList.declarations
      const call = declaration?.initializer
      if (declaration && ts.isIdentifier(declaration.name) && call && ts.isCallExpression(call) && call.expression.getText(source).endsWith('_Module.initialize')) {
        const deps = call.arguments[2]
        const uses = deps && ts.isObjectLiteralExpression(deps)
          ? deps.properties.flatMap(each => ts.isShorthandPropertyAssignment(each) ? [each.name.text] : ts.isPropertyAssignment(each) && ts.isIdentifier(each.initializer) ? [each.initializer.text] : [])
          : []
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

/** Puts the modules <ctx>-modules.ts initializes in an order where each comes after the ones it uses. */
export async function orderModules(path: string, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const modules = initializedIn(source)
  const order = sorted(modules)
  if (text === null || order.every((each, at) => each === modules[at])) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  let edited = text
  for (let at = modules.length - 1; at >= 0; at--) {
    const slot = modules[at]!.statement
    edited = `${edited.slice(0, slot.getStart(source))}${order[at]!.statement.getText(source)}${edited.slice(slot.getEnd())}`
  }
  await files.write(path, edited)
  return { status: 'updated', warnings: [] }
}
