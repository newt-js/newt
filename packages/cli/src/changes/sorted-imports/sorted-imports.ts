import { default as ts } from 'typescript'
// --------------------------------------------------------
import { importOrder }   from '../import-order/import-order'

type Kind = 'import' | 'export'
type Line = { kind: Kind, head: string, tail: string, path: string, name: string }

export const SEPARATOR = '// --------------------------------------------------------'

function kindOf(statement: ts.Statement): Kind | null {
  if (ts.isImportDeclaration(statement)) return statement.importClause ? 'import' : null
  if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) return 'export'
  return null
}

function linesOf(statement: ts.Statement, kind: Kind, source: ts.SourceFile): Line[] | null {
  const text = source.text
  const specifier = (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) ? statement.moduleSpecifier! : null
  if (!specifier || !ts.isStringLiteral(specifier)) return null
  const path = specifier.text
  const after = text.slice(specifier.getEnd(), statement.getEnd()).replace(/;\s*$/, '')
  const tail = `from ${specifier.getText(source)}${after}`
  const line = (text: string, type: boolean): Line => {
    const name = text.replace(/^type\s+/, '')
    const typed = type || name !== text
    return { kind, head: `${kind}${typed ? ' type' : ''} { ${name} }`, tail, path, name }
  }
  if (ts.isExportDeclaration(statement)) {
    const clause = statement.exportClause
    if (!clause) return [{ kind, head: 'export *', tail, path, name: '*' }]
    if (!ts.isNamedExports(clause)) return null
    return clause.elements.map(element => line(element.getText(source), statement.isTypeOnly))
  }
  const clause = (statement as ts.ImportDeclaration).importClause!
  const bindings = clause.namedBindings
  if (bindings && ts.isNamespaceImport(bindings)) return null
  return [
    ...clause.name ? [line(`default as ${clause.name.text}`, clause.isTypeOnly)] : [],
    ...bindings ? bindings.elements.map(element => line(element.getText(source), clause.isTypeOnly)) : [],
  ]
}

function expectedText(lines: Line[]): string {
  const column = Math.max(...lines.map(line => line.head.length)) + 1
  return (['import', 'export'] as const)
    .flatMap(kind => {
      const ofKind = lines.filter(line => line.kind === kind).sort(importOrder)
      return [ofKind.filter(line => !line.path.startsWith('.')), ofKind.filter(line => line.path.startsWith('.'))]
    })
    .filter(group => group.length > 0)
    .map(group => group.map(line => line.head.padEnd(column) + line.tail).join('\n'))
    .join(`\n${SEPARATOR}\n`)
}

/** `text` with its imports and exports as newt's lint wants them; left as it is when the lint could not fix it either. */
export function sortedImports(path: string, text: string): string {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind)
  const statements = [...source.statements]
  const indexes = statements.flatMap((statement, index) => kindOf(statement) === null ? [] : [index])
  if (indexes.length === 0) return text
  const region = statements.slice(indexes[0], indexes.at(-1)! + 1)
  const lines: Line[] = []
  for (const statement of region) {
    const kind = kindOf(statement)
    const own = kind && linesOf(statement, kind, source)
    if (!own) return text
    lines.push(...own)
  }
  const start = region[0]!.getStart(source)
  const end = region.at(-1)!.getEnd()
  const comments = text.slice(start, end).split('\n').some(each => /^\s*\/[/*]/.test(each) && each.trim() !== SEPARATOR)
  if (comments) return text
  return `${text.slice(0, start)}${expectedText(lines)}${text.slice(end)}`
}
