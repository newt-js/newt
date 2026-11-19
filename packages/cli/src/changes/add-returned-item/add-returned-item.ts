import { default as ts }              from 'typescript'
// --------------------------------------------------------
import type { AddReturnedItemChange } from '../../commands/command'
import type { ChangeOutcome }         from '../change-outcome'
import type { VirtualFiles }          from '../virtual-files/virtual-files'

function returnedList(source: ts.SourceFile, name: string): ts.ArrayLiteralExpression | undefined {
  const declared = source.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === name)
  const returned = declared?.body?.statements.findLast(ts.isReturnStatement)?.expression
  return returned && ts.isArrayLiteralExpression(returned) ? returned : undefined
}

/** Adds an item at the end of the list a function returns, `return [sales]`, on its line or on lines of their own once it passes 80 characters; one it has already is left alone. */
export async function addReturnedItem(change: AddReturnedItemChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, item } = change
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const list = returnedList(source, change.function)
  if (text === null || !list) {
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} has no function ${change.function} that returns a list, so newt did not change it: add ${item} to the list it returns`] }
  }
  const items = list.elements.map(each => each.getText(source))
  if (items.includes(item)) return { status: 'skipped', note: 'up to date', warnings: [] }
  const all = [...items, item]
  const [start, end] = [list.getStart(source), list.getEnd()]
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const indent = /^[ \t]*/.exec(text.slice(lineStart))![0]
  const one = `${text.slice(0, start)}[${all.join(', ')}]${text.slice(end)}`
  const lineEnd = one.indexOf('\n', start)
  const multiline = text.slice(start, end).includes('\n')
  const fits = !multiline && (lineEnd === -1 ? one.length : lineEnd) - lineStart <= 80
  const edited = fits ? one : `${text.slice(0, start)}[\n${all.map(each => `${indent}  ${each},\n`).join('')}${indent}]${text.slice(end)}`
  await files.write(path, edited)
  return { status: 'updated', warnings: [] }
}
