import { default as ts } from 'typescript'

/** The names of the members a class of `code` declares: its methods, fields and accessors. */
export function classMembers(code: string, className: string): string[] {
  const source = ts.createSourceFile('module.ts', code, ts.ScriptTarget.Latest, true)
  const declared = source.statements.find((each): each is ts.ClassDeclaration => ts.isClassDeclaration(each) && each.name?.text === className)
  return (declared?.members ?? []).flatMap(member => member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? [member.name.text] : [])
}
