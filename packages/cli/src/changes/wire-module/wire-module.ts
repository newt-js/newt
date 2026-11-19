import { default as ts }         from 'typescript'
// --------------------------------------------------------
import type { WireModuleChange } from '../../commands/command'
import { addedImports }          from '../added-imports/added-imports'
import type { ChangeOutcome }    from '../change-outcome'
import type { VirtualFiles }     from '../virtual-files/virtual-files'

type Body = ts.Block

/**
 * Where a class as newt writes it takes what it holds: its initialize, the object the `new` it returns
 * is given, its fields, its constructor's parameter that types that object, and its `super`.
 */
type Holder = {
  initialize: ts.MethodDeclaration & { body: Body }
  returned: ts.ReturnStatement
  given: ts.ObjectLiteralExpression
  fields: ts.PropertyDeclaration[]
  constructor: ts.ConstructorDeclaration & { body: Body }
  parameter: ts.ParameterDeclaration & { name: ts.Identifier, type: ts.TypeLiteralNode }
  superCall: ts.ExpressionStatement
}

type Edit = { at: number, text: string }

const isNamed = (node: ts.Node, name: string) => ts.isIdentifier(node) && node.text === name

const isSuperCall = (statement: ts.Statement): statement is ts.ExpressionStatement =>
  ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) && statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword

function holderIn(source: ts.SourceFile, className: string): Holder | undefined {
  const declared = source.statements.find((each): each is ts.ClassDeclaration => ts.isClassDeclaration(each) && each.name?.text === className)
  const initialize = declared?.members.find((each): each is ts.MethodDeclaration & { body: Body } =>
    ts.isMethodDeclaration(each) && isNamed(each.name, 'initialize') && each.body !== undefined)
  const constructor = declared?.members.find((each): each is ts.ConstructorDeclaration & { body: Body } => ts.isConstructorDeclaration(each) && each.body !== undefined)
  const returned = initialize?.body.statements.find(ts.isReturnStatement)
  const built = returned?.expression
  const given = built && ts.isNewExpression(built) && isNamed(built.expression, className) ? built.arguments?.at(-1) : undefined
  const parameter = constructor?.parameters.at(-1)
  const superCall = constructor?.body.statements.find(isSuperCall)
  if (!declared || !initialize || !constructor || !returned || !given || !ts.isObjectLiteralExpression(given) || !superCall
    || !parameter || !ts.isIdentifier(parameter.name) || !parameter.type || !ts.isTypeLiteralNode(parameter.type)) {
    return undefined
  }
  const fields = declared.members.filter((each): each is ts.PropertyDeclaration => ts.isPropertyDeclaration(each) && !each.initializer)
  return { initialize, returned, given, fields, constructor, parameter: parameter as Holder['parameter'], superCall }
}

const declares = (statement: ts.Statement, name: string) =>
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(each => isNamed(each.name, name))

/** `this.<name> = …`, or any `this.<field> = …` without a name. */
const assigns = (statement: ts.Statement, name?: string) =>
  ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression)
  && statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
  && ts.isPropertyAccessExpression(statement.expression.left)
  && statement.expression.left.expression.kind === ts.SyntaxKind.ThisKeyword
  && (name === undefined || statement.expression.left.name.text === name)

const lineStartOf = (text: string, at: number) => text.lastIndexOf('\n', at - 1) + 1
const lineEndOf = (text: string, at: number) => text.indexOf('\n', at) + 1
const indentOf = (text: string, node: ts.Node) => text.slice(lineStartOf(text, node.getStart()), node.getStart())

/** A new line, as indented as the one at `after`, right after it. */
const lineAfter = (text: string, after: ts.Node, line: string): Edit => ({ at: lineEndOf(text, after.getEnd()), text: `${indentOf(text, after)}${line}\n` })

/** The shorthand `name` in the object the `new` is given: `{ a, name }`. */
function givenEdit(given: ts.ObjectLiteralExpression, name: string): Edit {
  const last = given.properties.at(-1)
  return last ? { at: last.getEnd(), text: `, ${name}` } : { at: given.getStart() + 1, text: ` ${name} ` }
}

/** `name: Type,` in the type literal of the constructor's parameter, on its own line. */
function memberEdits(text: string, parameter: Holder['parameter'], member: string): Edit[] {
  const { type } = parameter
  const last = type.members.at(-1)
  if (!last) {
    const indent = indentOf(text, parameter)
    return [{ at: type.getStart() + 1, text: `\n${indent}  ${member},\n${indent}` }]
  }
  // The last one without its separator, as some formatters leave it, takes one before the new one comes.
  const separated = /[,;]$/.test(text.slice(last.getStart(), last.getEnd()))
  return [...separated ? [] : [{ at: last.getEnd(), text: ',' }], lineAfter(text, last, `${member},`)]
}

/** `private readonly name: Type` after the class's fields, or before its constructor when it has none. */
function fieldEdit(text: string, fields: ts.PropertyDeclaration[], constructor: ts.ConstructorDeclaration, field: string): Edit {
  const last = fields.at(-1)
  if (last) return lineAfter(text, last, field)
  const start = lineStartOf(text, constructor.getStart())
  return { at: start, text: `${indentOf(text, constructor)}${field}\n\n` }
}

/**
 * Wires a module into its context's class: declares it in its initialize, before what it returns,
 * gives it by name to the `new` it returns, types it in its constructor's last parameter and holds
 * it in a `private readonly` field the constructor sets, unpublished: all of it, or nothing.
 */
export async function wireModule({ path, className, name, type, declaration, imports }: WireModuleChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const found = text === null ? undefined : holderIn(source, className)
  if (text === null || !found) {
    const what = [...imports, declaration.trim(), `${name} in the object the new ${className}(…) its initialize returns is given`, `private readonly ${name}: ${type}`, `${name}: ${type} in the type of its constructor's last parameter`, `this.${name} = <that parameter>.${name}`].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} is not as newt wrote it, so newt did not change it: add ${what}`] }
  }
  const { initialize, returned, given, fields, constructor, parameter, superCall } = found
  const edits: Edit[] = []
  if (!initialize.body.statements.some(each => declares(each, name))) {
    edits.push({ at: lineStartOf(text, returned.getStart()), text: `${indentOf(text, returned)}${declaration.trim()}\n` })
  }
  if (!given.properties.some(each => each.name !== undefined && isNamed(each.name, name))) {
    edits.push(givenEdit(given, name))
  }
  if (!fields.some(each => isNamed(each.name, name))) {
    edits.push(fieldEdit(text, fields, constructor, `private readonly ${name}: ${type}`))
  }
  if (!parameter.type.members.some(each => each.name !== undefined && isNamed(each.name, name))) {
    edits.push(...memberEdits(text, parameter, `${name}: ${type}`))
  }
  if (!constructor.body.statements.some(each => assigns(each, name))) {
    const after = constructor.body.statements.filter(each => assigns(each)).at(-1) ?? superCall
    edits.push(lineAfter(text, after, `this.${name} = ${parameter.name.text}.${name}`))
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
