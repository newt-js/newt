import { default as ts }               from 'typescript'
// --------------------------------------------------------
import type { OpenUsedContextsChange } from '../../commands/command'
import type { UsedContext }            from '../../commands/command'
import { addedImports }                from '../added-imports/added-imports'
import type { ChangeOutcome }          from '../change-outcome'
import type { VirtualFiles }           from '../virtual-files/virtual-files'

const MAX = 80

const IMPORTS = [
  "import { Platform } from '@newt-js/core/application'",
  "import type { ContextToRun } from '@newt-js/core/http'",
]

const USED = 'let used: ContextToRun[]'

const CLOSE_USED = 'for (const each of used.toReversed()) {\n    await each.context.close()\n  }'

/** A call on one line, `head(a, b, {`, with the object's properties on lines of their own; or, past 80 characters, each argument on its own. */
function callLines(indent: string, head: string, args: string[], properties: string[]): string[] {
  const object = properties.length === 0 ? [] : properties.map(each => `${indent}  ${each},`)
  const opening = `${indent}${head}(${args.join(', ')}${properties.length === 0 ? ')' : ', {'}`
  if (opening.length <= MAX) return properties.length === 0 ? [opening] : [opening, ...object, `${indent}})`]
  const inner = properties.length === 0 ? [] : [`${indent}  {`, ...object.map(each => `  ${each}`), `${indent}  },`]
  return [`${indent}${head}(`, ...args.map(each => `${indent}  ${each},`), ...inner, `${indent})`]
}

/** The statements that open the contexts, in their order, and keep them to be closed. */
function openingLines(indent: string, opened: UsedContext[]): string[] {
  return [
    `${indent}const platform = new Platform()`,
    ...opened.flatMap(each => callLines(indent, `const ${each.camel} = await ${each.type}_Context.open`, ['platform', "'memory'"], each.uses.map(used => `${used}: ${used}.context`))),
    `${indent}used = [${opened.map(each => each.camel).join(', ')}]`,
  ]
}

/** That a statement is one this change writes, and so it may write again. */
function isOpening(statement: ts.Statement, source: ts.SourceFile): boolean {
  const text = statement.getText(source)
  return text.startsWith('const platform = new Platform()') || /^const \w+ = await \w+_Context\.open\(/.test(text) || text.startsWith('used = [')
}

function callOf(statement: ts.Statement, callee: string): ts.CallExpression | undefined {
  if (!ts.isExpressionStatement(statement)) return undefined
  const expression = ts.isBinaryExpression(statement.expression) ? statement.expression.right : statement.expression
  return ts.isCallExpression(expression) && expression.expression.getText() === callee ? expression : undefined
}

function hookBody(source: ts.SourceFile, hook: string): ts.ArrowFunction | undefined {
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue
    const call = statement.expression
    const [body] = call.arguments
    if (call.expression.getText(source) === hook && body && ts.isArrowFunction(body)) return body
  }
  return undefined
}

/** `text` with its afterEach closing the contexts the test opened too, after its own. */
function closingUsed(text: string): string {
  const source = ts.createSourceFile('test.ts', text, ts.ScriptTarget.Latest, true)
  const after = hookBody(source, 'afterEach')
  if (!after || after.getText(source).includes('used.toReversed()')) return text
  const body = after.body
  if (!ts.isBlock(body)) {
    const own = body.getText(source)
    const block = `async () => {\n  await ${own}\n  ${CLOSE_USED}\n}`
    return `${text.slice(0, after.getStart(source))}${block}${text.slice(after.getEnd())}`
  }
  const closing = body.statements.find(each => each.getText(source).includes('context.close()')) ?? body.statements.at(-1)
  const at = closing ? closing.getEnd() : body.getStart(source) + 1
  return `${text.slice(0, at)}\n  ${CLOSE_USED}${text.slice(at)}`
}

/**
 * Has a module's test open in memory the contexts its context is opened with, and those they are
 * opened with, each after the ones it uses, and initialize its context with them; its afterEach
 * closes them. Written again whole every time, from what newt says the contexts use.
 */
export async function openUsedContexts(change: OpenUsedContextsChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, context, opened, uses } = change
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const before = hookBody(source, 'beforeEach')
  const statements = before && ts.isBlock(before.body) ? [...before.body.statements] : []
  const initializing = statements.findIndex(each => callOf(each, `${context}_Context.initialize`))
  const signing = statements.findIndex(each => callOf(each, 'router.authenticateWith'))
  const between = statements.slice(signing + 1, initializing)
  if (text === null || initializing === -1 || signing === -1 || !between.every(each => isOpening(each, source))) {
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} is not as newt wrote it, so newt did not change it: open ${opened.map(each => each.camel).join(', ')} in its beforeEach, and initialize ${context}_Context with ${uses.join(', ')}`] }
  }
  const initialize = statements[initializing]!
  const call = callOf(initialize, `${context}_Context.initialize`)!
  const indent = /[ \t]*$/.exec(text.slice(0, initialize.getStart(source)))![0]
  const assigned = initialize.getText(source).slice(0, call.getStart(source) - initialize.getStart(source))
  const args = call.arguments.slice(0, 2).map(each => each.getText(source))
  const lines = [
    ...openingLines(indent, opened),
    ...callLines(indent, `${assigned}${context}_Context.initialize`, args, uses.map(used => `${used}: ${used}.context`)),
  ]
  const start = between[0]?.getStart(source) ?? initialize.getStart(source)
  let edited = `${text.slice(0, start - indent.length)}${lines.join('\n')}${text.slice(initialize.getEnd())}`
  if (!edited.includes(USED)) edited = edited.replace(/^let context: TestContext\n/m, match => `${match}${USED}\n`)
  edited = closingUsed(edited)
  edited = addedImports(edited, [...IMPORTS, ...change.imports])
  if (edited === text) return { status: 'skipped', note: 'up to date', warnings: [] }
  await files.write(path, edited)
  return { status: 'updated', warnings: [] }
}
