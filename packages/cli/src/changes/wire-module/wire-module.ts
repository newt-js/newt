import { default as ts }         from 'typescript'
// --------------------------------------------------------
import type { WireModuleChange } from '../../commands/command'
import { addedImports }          from '../added-imports/added-imports'
import type { ChangeOutcome }    from '../change-outcome'
import type { VirtualFiles }     from '../virtual-files/virtual-files'

/** Where a class as newt writes it takes what it holds: its initialize, the `new` it returns, its constructor and its `super`. */
type Holder = {
  returned: ts.ReturnStatement
  built: ts.NewExpression & { arguments: ts.NodeArray<ts.Expression> }
  initialize: ts.MethodDeclaration & { body: ts.Block }
  constructor: ts.ConstructorDeclaration
  list: ts.ArrayLiteralExpression | undefined
}

type Edit = { at: number, text: string }

const isNamed = (node: ts.Node, name: string) => ts.isIdentifier(node) && node.text === name

function holderIn(source: ts.SourceFile, className: string): Holder | undefined {
  const declared = source.statements.find((each): each is ts.ClassDeclaration => ts.isClassDeclaration(each) && each.name?.text === className)
  const initialize = declared?.members.find((each): each is ts.MethodDeclaration & { body: ts.Block } =>
    ts.isMethodDeclaration(each) && isNamed(each.name, 'initialize') && each.body !== undefined)
  const constructor = declared?.members.find((each): each is ts.ConstructorDeclaration => ts.isConstructorDeclaration(each) && each.body !== undefined)
  const returned = initialize?.body.statements.find(ts.isReturnStatement)
  const built = returned?.expression
  if (!initialize || !constructor || !returned || !built || !ts.isNewExpression(built) || !isNamed(built.expression, className) || !built.arguments?.length) {
    return undefined
  }
  const superCall = constructor.body?.statements
    .flatMap(each => ts.isExpressionStatement(each) && ts.isCallExpression(each.expression) && each.expression.expression.kind === ts.SyntaxKind.SuperKeyword ? [each.expression] : [])[0]
  const list = superCall?.arguments.find(ts.isArrayLiteralExpression)
  return { returned, built: built as Holder['built'], initialize, constructor, list }
}

const declares = (statement: ts.Statement, name: string) =>
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(each => isNamed(each.name, name))

/** The edits that give the constructor a `readonly` parameter, on its own line when its parameters are each on one. */
function parameterEdit(text: string, constructor: ts.ConstructorDeclaration, parameter: string): Edit {
  const last = constructor.parameters.at(-1)!
  const opening = text.indexOf('(', constructor.getStart())
  const oneEach = text.slice(opening, constructor.parameters[0]!.getStart()).includes('\n')
  if (!oneEach) return { at: last.getEnd(), text: `, ${parameter}` }
  const lineEnd = text.indexOf('\n', last.getEnd()) + 1
  const lineStart = text.lastIndexOf('\n', last.getStart()) + 1
  const indent = text.slice(lineStart, last.getStart())
  return { at: lineEnd, text: `${indent}${parameter},\n` }
}

/**
 * Wires a module into its feature's class (a feature into its context's): declares it in its initialize,
 * before what it returns, hands it to the `new` it returns, takes it as a `readonly` parameter of its
 * constructor and, when its `super` is given a list, lists it there: all of it, or nothing.
 */
export async function wireModule({ path, className, name, type, declaration, imports }: WireModuleChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const found = holderIn(source, className)
  if (text === null || !found) {
    const what = [...imports, declaration.trim(), `${name} in the new ${className}(…) its initialize returns`, `readonly ${name}: ${type} in its constructor`].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} is not as newt wrote it, so newt did not change it: add ${what}`] }
  }
  const { returned, built, initialize, constructor, list } = found
  const edits: Edit[] = []
  if (!initialize.body.statements.some(each => declares(each, name))) {
    const lineStart = text.lastIndexOf('\n', returned.getStart(source)) + 1
    edits.push({ at: lineStart, text: `${text.slice(lineStart, returned.getStart(source))}${declaration.trim()}\n` })
  }
  if (!built.arguments.some(each => isNamed(each, name))) {
    edits.push({ at: built.arguments.at(-1)!.getEnd(), text: `, ${name}` })
  }
  if (!constructor.parameters.some(each => isNamed(each.name, name))) {
    edits.push(parameterEdit(text, constructor, `readonly ${name}: ${type}`))
  }
  if (list && !list.elements.some(each => isNamed(each, name))) {
    edits.push(list.elements.length === 0 ? { at: list.getStart(source) + 1, text: name } : { at: list.elements.at(-1)!.getEnd(), text: `, ${name}` })
  }
  if (edits.length === 0 && addedImports(text, imports) === text) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const edited = edits
    .sort((one, other) => other.at - one.at)
    .reduce((current, edit) => `${current.slice(0, edit.at)}${edit.text}${current.slice(edit.at)}`, text)
  await files.write(path, addedImports(edited, imports))
  return { status: 'updated', warnings: [] }
}
