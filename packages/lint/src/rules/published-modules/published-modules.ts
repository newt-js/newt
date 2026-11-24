import { TSESLint }        from '@typescript-eslint/utils'
import { readFileSync }    from 'node:fs'
import { statSync }        from 'node:fs'
import { posix }           from 'node:path'
import { default as ts }   from 'typescript'
// --------------------------------------------------------
import { ROOT }            from '../../paths/paths'
import { absolute }        from '../../paths/paths'
import { camelCase }       from '../../paths/paths'
import { contextOf }       from '../../paths/paths'
import { importsOf }       from '../../paths/paths'
import { isModuleEntry }   from '../../paths/paths'
import { moduleOfContext } from '../../paths/paths'
import { real }            from '../../paths/paths'
import { resolved }        from '../../paths/paths'
import { rootOf }          from '../../paths/paths'

export type PublishedModulesOptions = { folder: string }

/** What each context file publishes, kept while it is as it was read. */
const read = new Map<string, { stamp: number, published: string[] }>()

/**
 * The modules a context publishes: the public fields of the class in its
 * `<name>.context.ts`, as `public readonly workspace: Workspace_Module`.
 */
export function publishedBy(file: string): string[] {
  const stamp = statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0
  const known = read.get(file)
  if (known?.stamp === stamp) return known.published
  const text = stamp ? readFileSync(file, 'utf8') : ''
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest)
  const published: string[] = []
  const hidden = [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.StaticKeyword]
  for (const statement of source.statements) {
    if (!ts.isClassDeclaration(statement)) continue
    for (const member of statement.members) {
      if (!ts.isPropertyDeclaration(member) || !ts.isIdentifier(member.name)) continue
      const isPublic = !member.modifiers?.some(modifier => hidden.includes(modifier.kind))
      if (isPublic) published.push(member.name.text)
    }
  }
  read.set(file, { stamp, published })
  return published
}

/**
 * A context reaches another only through what it offers: its class, `<name>.context.ts`,
 * whose public fields are the modules it publishes, and of those, what their `index.ts`
 * offers. Which contexts it may reach at all,
 * `newt/context-imports` says.
 */
export const publishedModules: TSESLint.RuleModule<'unpublished' | 'inside', [PublishedModulesOptions]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: 'Another context is reached only through its class and the modules it publishes.' },
    messages: {
      unpublished: "'{{path}}' is of {{module}}, which {{context}} does not publish: another context reaches only the modules {{context}}.context.ts holds in a public field. If {{context}} offers it, publish it there (newt publish {{context}}/{{folder}}).",
      inside: "'{{path}}' is {{context}}'s own: from another context, import {{context}}.context.ts, and of a module it publishes, only its index.ts, by its folder.",
    },
    schema: [{
      type: 'object',
      properties: { folder: { type: 'string' } },
      required: ['folder'],
      additionalProperties: false,
    }],
  },
  create(context) {
    const folder = absolute(context.options[0].folder, rootOf(context))
    const own = contextOf(context.physicalFilename, folder)
    if (!own || own === ROOT) return {}
    return importsOf((node, specifier) => {
      const path = resolved(context, specifier)
      const other = path && contextOf(path, folder)
      if (!other || other === own || other === ROOT) return
      const contextFile = posix.join(real(folder), other, `${other}.context`)
      if (real(path) === contextFile) return
      const imported = moduleOfContext(path, folder)
      if (!imported || !isModuleEntry(imported.inside)) {
        context.report({ node, messageId: 'inside', data: { path: specifier, context: other } })
        return
      }
      const module = camelCase(imported.module)
      if (!publishedBy(`${contextFile}.ts`).includes(module)) {
        context.report({ node, messageId: 'unpublished', data: { path: specifier, context: other, module, folder: imported.module } })
      }
    })
  },
}
