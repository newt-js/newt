import { default as ts } from 'typescript'

type Imported = { from: string, names: string[] }

function importsIn(source: ts.SourceFile): Imported[] {
  return source.statements.filter(ts.isImportDeclaration).map(declaration => {
    const clause = declaration.importClause
    const bindings = clause?.namedBindings
    const names = [
      ...clause?.name ? [clause.name.text] : [],
      ...bindings && ts.isNamedImports(bindings) ? bindings.elements.map(element => element.name.text) : [],
      ...bindings && ts.isNamespaceImport(bindings) ? [bindings.name.text] : [],
    ]
    return { from: (declaration.moduleSpecifier as ts.StringLiteral).text, names }
  })
}

const sourceOf = (text: string) => ts.createSourceFile('file.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

/** `text` with the import lines it lacks, after its last import: a line whose names it imports already is left out. */
export function addedImports(text: string, imports: string[]): string {
  const source = sourceOf(text)
  const present = importsIn(source)
  const missing = imports.filter(line => {
    const [wanted] = importsIn(sourceOf(line))
    return !wanted || !wanted.names.every(name => present.some(each => each.from === wanted.from && each.names.includes(name)))
  })
  if (missing.length === 0) return text
  const last = source.statements.filter(ts.isImportDeclaration).at(-1)
  const at = last ? last.getEnd() : 0
  const block = missing.join('\n')
  return last ? `${text.slice(0, at)}\n${block}${text.slice(at)}` : `${block}\n\n${text}`
}
