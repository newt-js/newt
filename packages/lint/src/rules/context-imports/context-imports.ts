import { TSESLint }      from '@typescript-eslint/utils'
import { readFileSync }  from 'node:fs'
import { readdirSync }   from 'node:fs'
import { statSync }      from 'node:fs'
import { posix }         from 'node:path'
import { default as ts } from 'typescript'
// --------------------------------------------------------
import { ROOT }          from '../../paths/paths'
import { absolute }      from '../../paths/paths'
import { contextOf }     from '../../paths/paths'
import { importsOf }     from '../../paths/paths'
import { real }          from '../../paths/paths'
import { resolved }      from '../../paths/paths'
import { rootOf }        from '../../paths/paths'
import { target }        from '../../paths/paths'

/** Every context, each with the contexts it uses. */
export type Uses = Record<string, string[]>

export type ContextImportsOptions = { folder: string, uses?: Uses }

/** That `uses` says a tree: every context it names is one of its keys, and none uses itself, directly or through others. */
export function assertUsesTree(uses: Uses): void {
  for (const [name, used] of Object.entries(uses)) {
    const unknown = used.find(each => !Object.hasOwn(uses, each))
    if (unknown !== undefined) {
      throw new Error(`@newt-js/lint: the context '${name}' uses '${unknown}', which is not in \`uses\`: list every context, each with the ones it uses ([] for none).`)
    }
  }
  const done = new Set<string>()
  const visit = (name: string, path: string[]) => {
    if (path.includes(name)) {
      throw new Error(`@newt-js/lint: contexts never use each other in a cycle, and \`uses\` says ${[...path.slice(path.indexOf(name)), name].join(' → ')}.`)
    }
    if (done.has(name)) return
    for (const each of uses[name] ?? []) visit(each, [...path, name])
    done.add(name)
  }
  for (const name of Object.keys(uses)) visit(name, [])
}

/** What each folder of contexts declares, kept while its context files are as they were read. */
const declared = new Map<string, { stamp: string, uses: Uses }>()

/**
 * What the code of the contexts in `folder` (absolute) says each one uses: the contexts
 * its `<name>/<name>.context.ts` imports, where it is opened with what it uses. A context
 * folder with no such file uses none. Read again whenever one of those files changes.
 */
export function declaredUses(folder: string): Uses {
  const names = readdirSync(folder, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  const files = names.map(name => posix.join(real(folder), name, `${name}.context.ts`))
  // Each name with its time: a folder renamed keeps its file's time.
  const stamp = files.map(file => `${file}:${statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0}`).join(' ')
  const known = declared.get(folder)
  if (known?.stamp === stamp) return known.uses
  const uses: Uses = {}
  names.forEach((name, at) => {
    const file = files[at]!
    const text = statSync(file, { throwIfNoEntry: false })?.isFile() ? readFileSync(file, 'utf8') : ''
    const imported = ts.preProcessFile(text, true, true).importedFiles.map(each => each.fileName).filter(specifier => specifier.startsWith('.'))
    const others = imported.map(specifier => contextOf(target(file, specifier), folder)).filter(other => other !== null && other !== ROOT && other !== name)
    uses[name] = [...new Set(others as string[])].sort()
  })
  declared.set(folder, { stamp, uses })
  return uses
}

/**
 * Each context imports only the contexts it says it uses, so they never form a cycle:
 * those `uses` lists, or, with none, those its `<name>.context.ts` imports. A context is a
 * folder of `folder`; a file directly in `folder` is in none: it imports no context, and
 * no context imports it.
 */
export const contextImports: TSESLint.RuleModule<'other' | 'declared' | 'root' | 'fromRoot' | 'tree', [ContextImportsOptions]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: 'A context imports only the contexts it says it uses.' },
    messages: {
      other: "'{{path}}' is the context {{other}}'s, and {{context}} uses {{uses}}: a context imports only the ones `uses` lists for it, never in a cycle.",
      declared: "'{{path}}' is the context {{other}}'s, and {{context}}.context.ts imports {{uses}}: a context uses only the contexts its {{context}}.context.ts imports, where it is opened with them. Import it there first, if {{context}} must use it.",
      tree: '{{problem}}',
      root: "'{{path}}' is in the folder of the contexts, in none of them: no context imports it, so none reaches another through it. Move it into the context that owns it.",
      fromRoot: "'{{path}}' is the context {{other}}'s, and a file in the folder of the contexts, in none of them, imports no context.",
    },
    schema: [{
      type: 'object',
      properties: {
        folder: { type: 'string' },
        uses: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
      },
      required: ['folder'],
      additionalProperties: false,
    }],
  },
  create(context) {
    const [{ folder: written, uses: given }] = context.options
    const folder = absolute(written, rootOf(context))
    const own = contextOf(context.physicalFilename, folder)
    if (!own) return {}
    const uses = given ?? declaredUses(folder)
    try {
      assertUsesTree(uses)
    } catch (error) {
      return { Program: node => context.report({ node, messageId: 'tree', data: { problem: (error as Error).message } }) }
    }
    const allowed = uses[own] ?? []
    return importsOf((node, specifier) => {
      const path = resolved(context, specifier)
      const other = path && contextOf(path, folder)
      if (!other || other === own || allowed.includes(other)) return
      if (other === ROOT) {
        context.report({ node, messageId: 'root', data: { path: specifier } })
      } else if (own === ROOT) {
        context.report({ node, messageId: 'fromRoot', data: { path: specifier, other } })
      } else {
        const data = { path: specifier, other, context: own, uses: allowed.length ? allowed.join(', ') : 'no other context' }
        context.report({ node, messageId: given ? 'other' : 'declared', data })
      }
    })
  },
}
