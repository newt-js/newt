import { default as ts } from 'typescript'
// --------------------------------------------------------
import { CommandError }  from '../../commands/command-error/command-error'
import { endOfLine }     from '../end-of-line/end-of-line'

type Name = { name: string, from: string, typeOnly: boolean, node: ts.ImportSpecifier | undefined, declaration: ts.ImportDeclaration }

function namesIn(source: ts.SourceFile): Name[] {
  return source.statements.filter(ts.isImportDeclaration).flatMap(declaration => {
    const clause = declaration.importClause
    const bindings = clause?.namedBindings
    const from = (declaration.moduleSpecifier as ts.StringLiteral).text
    const whole = clause?.isTypeOnly ?? false
    const name = (text: string, node?: ts.ImportSpecifier): Name => ({ name: text, from, typeOnly: whole || (node?.isTypeOnly ?? false), node, declaration })
    return [
      ...clause?.name ? [name(clause.name.text)] : [],
      ...bindings && ts.isNamedImports(bindings) ? bindings.elements.map(element => name(element.name.text, element)) : [],
      ...bindings && ts.isNamespaceImport(bindings) ? [name(bindings.name.text)] : [],
    ]
  })
}

const sourceOf = (text: string) => ts.createSourceFile('file.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

/** `text` with the type of an import a value now needs taken off: `import { type X }` or `import type { X, Y }` → `import { X, type Y }`. */
function asValue(text: string, source: ts.SourceFile, present: Name): string {
  if (present.node?.isTypeOnly) {
    const start = present.node.getStart(source)
    return `${text.slice(0, start)}${text.slice(start).replace(/^type\s+/, '')}`
  }
  const clause = present.declaration.importClause!
  const bindings = clause.namedBindings
  if (!bindings || !ts.isNamedImports(bindings)) return text
  const elements = bindings.elements.map(element => element.name.text === present.name ? element.getText(source) : `type ${element.getText(source)}`)
  return `${text.slice(0, clause.getStart(source))}{ ${elements.join(', ')} }${text.slice(clause.getEnd())}`
}

/** `text` with the import lines it lacks, after its last import: a line whose names it imports already is left out; a name it imports from elsewhere is refused. */
export function addedImports(text: string, imports: string[]): string {
  let edited = text
  const missing: string[] = []
  for (const line of imports) {
    const wanted = namesIn(sourceOf(line))
    if (wanted.length === 0) {
      missing.push(line)
      continue
    }
    let lacking = false
    for (const want of wanted) {
      const source = sourceOf(edited)
      const present = namesIn(source).find(each => each.name === want.name)
      if (!present) lacking = true
      else if (present.from !== want.from) {
        throw new CommandError(`the file imports ${want.name} from '${present.from}' already, and newt's code needs it from '${want.from}': rename the one it has`)
      } else if (present.typeOnly && !want.typeOnly) edited = asValue(edited, source, present)
    }
    if (lacking) missing.push(line)
  }
  if (missing.length === 0) return edited
  const source = sourceOf(edited)
  const last = source.statements.filter(ts.isImportDeclaration).at(-1)
  const block = missing.join('\n')
  if (last) {
    const { at } = endOfLine(edited, last.getEnd())
    return `${edited.slice(0, at)}\n${block}${edited.slice(at)}`
  }
  const shebang = /^#![^\n]*\n/.exec(edited)?.[0] ?? ''
  return `${shebang}${block}\n\n${edited.slice(shebang.length)}`
}
