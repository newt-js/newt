import { default as ts } from 'typescript'

function classesOf(node: ts.Node): ts.ClassLikeDeclaration[] {
  const own = ts.isClassLike(node) ? [node] : []
  return [...own, ...node.getChildren().flatMap(classesOf)]
}

/** `text` with a blank line inside each class of several lines, at each end, as newt's lint wants it. */
export function paddedClasses(path: string, text: string): string {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind)
  let edited = text
  const classes = classesOf(source).sort((a, b) => b.getEnd() - a.getEnd())
  for (const each of classes) {
    const open = each.members.pos
    const close = each.getEnd() - 1
    const body = edited.slice(open, close)
    if (body.trim() === '' || !body.startsWith('\n') && !/^[ \t]+\n/.test(body)) continue
    const indent = /\n([ \t]*)$/.exec(body)?.[1]
    if (indent === undefined) continue
    const padded = `\n\n${body.replace(/^(?:[ \t]*\n)+/, '').replace(/(?:\n[ \t]*)+$/, '')}\n\n${indent}`
    edited = `${edited.slice(0, open)}${padded}${edited.slice(close)}`
  }
  return edited
}
