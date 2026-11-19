import type { Rule } from 'eslint'
// --------------------------------------------------------
import { compare }   from './compare/compare'
import { isPackage } from './is-package/is-package'

type Statement = Rule.Node
type Kind = 'import' | 'export'
type Line = { kind: Kind, head: string, tail: string, path: string, name: string }

export const SEPARATOR = '// --------------------------------------------------------'

export const importsAndExports: Rule.RuleModule = {
  meta: {
    type: 'layout',
    fixable: 'code',
    messages: {
      shape: 'Imports, then exports; packages, then local files; one name per line, in braces, sorted and aligned at `from`.',
      star: 'Name what it takes, in braces: `{{text}}` takes everything.',
      scattered: 'Imports and exports go together, at the head of the file: this is between them.',
    },
    schema: [],
  },
  create(context) {
    const code = context.sourceCode

    function kindOf(statement: Statement): Kind | null {
      if (statement.type === 'ImportDeclaration') return statement.specifiers.length > 0 ? 'import' : null
      if (statement.type === 'ExportAllDeclaration') return 'export'
      if (statement.type === 'ExportNamedDeclaration' && statement.source != null) return 'export'
      return null
    }

    function linesOf(statement: Statement, kind: Kind): Line[] | null {
      if (statement.type === 'ExportAllDeclaration') {
        if (statement.exported != null) return null
        const path = String(statement.source.value)
        return [{ kind, head: 'export *', tail: `from ${code.getText(statement.source as Rule.Node)}`, path, name: '*' }]
      }
      if (statement.type !== 'ImportDeclaration' && statement.type !== 'ExportNamedDeclaration') return null
      const source = statement.source!
      const path = String(source.value)
      const isType = (statement as { importKind?: string, exportKind?: string })[kind === 'import' ? 'importKind' : 'exportKind'] === 'type'
      const after = code.text.slice(source.range![1], statement.range![1]).replace(/;\s*$/, '')
      const tail = `from ${code.getText(source as Rule.Node)}${after}`
      const lines: Line[] = []
      for (const specifier of statement.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') return null
        const text = specifier.type === 'ImportDefaultSpecifier'
          ? `default as ${specifier.local.name}`
          : code.getText(specifier as Rule.Node)
        const name = text.replace(/^type\s+/, '')
        const typed = isType || name !== text
        lines.push({ kind, head: `${kind}${typed ? ' type' : ''} { ${name} }`, tail, path, name })
      }
      return lines
    }

    function expectedText(lines: Line[]): string {
      const column = Math.max(...lines.map(line => line.head.length)) + 1
      const groups = (['import', 'export'] as const).flatMap(kind => {
        const ofKind = lines.filter(line => line.kind === kind).sort(compare)
        return [ofKind.filter(isPackage), ofKind.filter(line => !isPackage(line))]
      })
      return groups
        .filter(group => group.length > 0)
        .map(group => group.map(line => line.head.padEnd(column) + line.tail).join('\n'))
        .join(`\n${SEPARATOR}\n`)
    }

    return {
      Program(program) {
        const body = program.body as Statement[]
        const indexes = body.flatMap((statement, index) => (kindOf(statement) == null ? [] : [index]))
        if (indexes.length === 0) return
        const region = body.slice(indexes[0], indexes.at(-1)! + 1)

        const lines: Line[] = []
        let fixable = true
        for (const statement of region) {
          const kind = kindOf(statement)
          if (kind == null) {
            context.report({ node: statement, messageId: 'scattered' })
            fixable = false
            continue
          }
          const own = linesOf(statement, kind)
          if (own == null) {
            context.report({ node: statement, messageId: 'star', data: { text: code.getText(statement) } })
            fixable = false
            continue
          }
          lines.push(...own)
        }
        if (!fixable) return

        const range: [number, number] = [region[0]!.range![0], region.at(-1)!.range![1]]
        const expected = expectedText(lines)
        if (code.text.slice(...range) === expected) return
        const hasOtherComments = code.getAllComments().some(comment =>
          comment.range![0] >= range[0] && comment.range![1] <= range[1] && `//${comment.value}` !== SEPARATOR)
        context.report({
          node: region[0]!,
          messageId: 'shape',
          fix: hasOtherComments ? null : fixer => fixer.replaceTextRange(range, expected),
        })
      },
    }
  },
}
