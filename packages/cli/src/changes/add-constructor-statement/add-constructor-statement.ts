import { default as ts }                      from 'typescript'
// --------------------------------------------------------
import type { AddConstructorStatementChange } from '../../commands/command'
import type { ChangeOutcome }                 from '../change-outcome'
import { endOfLine }                          from '../end-of-line/end-of-line'
import type { VirtualFiles }                  from '../virtual-files/virtual-files'

const bare = (statement: string) => statement.replace(/\s+/g, '').replace(/;$/, '')

/** Adds a statement at the end of a class's constructor; one it has already is left alone. */
export async function addConstructorStatement({ path, className, statement }: AddConstructorStatementChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const found = source.statements.find((each): each is ts.ClassDeclaration => ts.isClassDeclaration(each) && each.name?.text === className)
  const body = found?.members.find((member): member is ts.ConstructorDeclaration => ts.isConstructorDeclaration(member) && member.body !== undefined)?.body
  if (text === null || !body) {
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} has no constructor of ${className}, so newt did not change it: add to it ${statement}`] }
  }
  if (body.statements.some(each => bare(each.getText(source)) === bare(statement))) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const last = body.statements.at(-1)
  if (!last) {
    const start = body.getStart(source)
    const closing = /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', start) + 1))![0]
    await files.write(path, `${text.slice(0, start)}{\n${closing}  ${statement}\n${closing}}${text.slice(body.getEnd())}`)
    return { status: 'updated', warnings: [] }
  }
  const indent = /([ \t]*)$/.exec(text.slice(0, last.getStart(source)))?.[1] ?? '    '
  const { at } = endOfLine(text, last.getEnd())
  await files.write(path, `${text.slice(0, at)}\n${indent}${statement}${text.slice(at)}`)
  return { status: 'updated', warnings: [] }
}
