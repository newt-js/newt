import { default as ts }             from 'typescript'
// --------------------------------------------------------
import type { AddClassMemberChange } from '../../commands/command'
import { addedImports }              from '../added-imports/added-imports'
import type { ChangeOutcome }        from '../change-outcome'
import type { VirtualFiles }         from '../virtual-files/virtual-files'

const memberName = (member: ts.ClassElement) => member.name && ts.isIdentifier(member.name) ? member.name.text : undefined

/** Adds a member at the end of a class, with its imports; one the class has already is left alone. */
export async function addClassMember(change: AddClassMemberChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, className, name, member, imports } = change
  const text = await files.read(path)
  const source = ts.createSourceFile(path, text ?? '', ts.ScriptTarget.Latest, true)
  const found = source.statements.find((statement): statement is ts.ClassDeclaration => ts.isClassDeclaration(statement) && statement.name?.text === className)
  if (text === null || !found) {
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} has no class ${className}, so newt did not change it: add to it\n${member}`] }
  }
  if (found.members.some(each => memberName(each) === name)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const close = found.getEnd() - 1
  const before = text.slice(0, close).replace(/\s*$/, '')
  const edited = `${before}\n\n${member.replace(/\n*$/, '')}\n${text.slice(close)}`
  await files.write(path, addedImports(edited, imports))
  return { status: 'updated', warnings: [] }
}
