import { default as ts } from 'typescript'

export type UseCase = { inputs: number, returnsNothing: boolean }

/** A use case of a module's class in `code`, read from its method: how many inputs it takes and whether it tells nothing; null when the class has no such method. */
export function useCaseOf(code: string, className: string, name: string): UseCase | null {
  const source = ts.createSourceFile('module.ts', code, ts.ScriptTarget.Latest, true)
  const declared = source.statements.find((each): each is ts.ClassDeclaration => ts.isClassDeclaration(each) && each.name?.text === className)
  const method = declared?.members.find((member): member is ts.MethodDeclaration => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === name)
  if (!method) return null
  const returned = method.type?.getText(source).replace(/\s+/g, '')
  return { inputs: method.parameters.length, returnsNothing: returned === 'Promise<void>' || returned === 'void' }
}
