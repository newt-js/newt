import { default as ts }                      from 'typescript'
// --------------------------------------------------------
import type { AddConstructorStatementChange } from '../../commands/command'
import type { ChangeOutcome }                 from '../change-outcome'
import type { VirtualFiles }                  from '../virtual-files/virtual-files'

/** Adds a statement at the end of a class's constructor; one it has already is left alone. */
export async function addConstructorStatement({ path, className, statement }: AddConstructorStatementChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const found = source.statements.find((each): each is ts.ClassDeclaration => ts.isClassDeclaration(each) && each.name?.text === className)
  const body = found?.members.find(ts.isConstructorDeclaration)?.body
  if (text === null || !body) {
    return { status: 'skipped', note: 'not as newt wrote it', warnings: [`${path} has no constructor of ${className}, so newt did not change it: add to it ${statement}`] }
  }
  if (body.statements.some(each => each.getText(source) === statement)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const last = body.statements.at(-1)
  const indent = last ? /([ \t]*)$/.exec(text.slice(0, last.getStart(source)))?.[1] ?? '    ' : '    '
  const at = last ? last.getEnd() : body.getStart(source) + 1
  await files.write(path, `${text.slice(0, at)}\n${indent}${statement}${text.slice(at)}`)
  return { status: 'updated', warnings: [] }
}
