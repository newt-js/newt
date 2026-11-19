import { default as ts }              from 'typescript'
// --------------------------------------------------------
import type { AddTypePropertyChange } from '../../commands/command'
import { addedImports }               from '../added-imports/added-imports'
import type { ChangeOutcome }         from '../change-outcome'
import type { VirtualFiles }          from '../virtual-files/virtual-files'

const keyOf = (member: ts.TypeElement) => member.name && ts.isIdentifier(member.name) ? member.name.text : undefined

function typeIn(source: ts.SourceFile, name: string): ts.TypeLiteralNode | undefined {
  const alias = source.statements.find((statement): statement is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(statement) && statement.name.text === name)
  return alias && ts.isTypeLiteralNode(alias.type) ? alias.type : undefined
}

/** The type under `key` of `type`, `auth: { … }`; `undefined` when it has no such key, `null` when that key holds another kind of type. */
function typeUnder(type: ts.TypeLiteralNode, key: string): ts.TypeLiteralNode | undefined | null {
  const member = type.members.find(each => keyOf(each) === key)
  if (!member) return undefined
  return ts.isPropertySignature(member) && member.type && ts.isTypeLiteralNode(member.type) ? member.type : null
}

/** `text` with a member added at the end of a type, on its line, `{ a: A, b: B }`, or on one of its own, as the type is written. */
function withMember(text: string, source: ts.SourceFile, type: ts.TypeLiteralNode, member: string): string {
  const start = type.getStart(source)
  const end = type.getEnd()
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const indent = /^[ \t]*/.exec(text.slice(lineStart))![0]
  const multiline = text.slice(start, end).includes('\n')
  const last = type.members.at(-1)
  if (multiline) {
    const separator = last ? /[,;]$/.exec(last.getText(source))?.[0] ?? '' : ''
    const at = last ? last.getEnd() : end - 1
    if (!last) return `${text.slice(0, at).replace(/\s*$/, '')}\n${indent}  ${member}\n${indent}${text.slice(at)}`
    return `${text.slice(0, at)}\n${indent}  ${member}${separator}${text.slice(at)}`
  }
  const members = [...type.members.map(each => each.getText(source).replace(/[,;]$/, '')), member]
  const one = `${text.slice(0, start)}{ ${members.join(', ')} }${text.slice(end)}`
  const lineEnd = one.indexOf('\n', start)
  if ((lineEnd === -1 ? one.length : lineEnd) - lineStart <= 80) return one
  return `${text.slice(0, start)}{\n${members.map(each => `${indent}  ${each}\n`).join('')}${indent}}${text.slice(end)}`
}

/** Adds a member to a type, `type X = { … }`, or to the one under `in` of it, with its imports; a key it has already is left alone. */
export async function addTypeProperty(change: AddTypePropertyChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, key, value, imports } = change
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const type = typeIn(source, change.type)
  const inner = type && change.in !== undefined ? typeUnder(type, change.in) : undefined
  if (text === null || !type || inner === null) {
    const shown = change.in === undefined ? `${key}: ${value}` : `${change.in}: { ${key}: ${value} }`
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} has no type ${change.type} = { … }, so newt did not change it: add ${shown} to it`] }
  }
  const target = inner ?? type
  const targetKey = inner || change.in === undefined ? key : change.in
  if (target.members.some(each => keyOf(each) === targetKey)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const member = change.in !== undefined && !inner ? `${change.in}: { ${key}: ${value} }` : `${key}: ${value}`
  await files.write(path, addedImports(withMember(text, source, target, member), imports))
  return { status: 'updated', warnings: [] }
}
