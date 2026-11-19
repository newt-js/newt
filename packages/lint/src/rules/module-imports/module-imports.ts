import { TSESLint }      from '@typescript-eslint/utils'
import { TSESTree }      from '@typescript-eslint/utils'
import { readFileSync }  from 'node:fs'
import { readdirSync }   from 'node:fs'
import { statSync }      from 'node:fs'
import { posix }         from 'node:path'
import { default as ts } from 'typescript'
// --------------------------------------------------------
import { isTypeOnly }    from '../../ast/ast'
import { camelCase }     from '../../paths/paths'
import { importsOf }     from '../../paths/paths'
import { modulePlace }   from '../../paths/paths'
import { real }          from '../../paths/paths'
import { resolved }      from '../../paths/paths'
import { rootOf }        from '../../paths/paths'
import { sameModule }    from '../../paths/paths'
import { slashed }       from '../../paths/paths'
import { target }        from '../../paths/paths'

/** What a module offers the others as types alone: its module (the type of the dependency it is given), its DTOs and what it tells. */
export const API_TYPES = /^(?:[^/]+\.module|[^/]+\.schema|events\/.+)$/

/** What a module offers the others as it is: how its use cases fail, to tell one known error from another. */
export const API_VALUES = /^errors\/.+$/

/** What the modules of each `modules/` folder use, kept while their deps files are as they were read. */
const declared = new Map<string, { stamp: string, uses: Record<string, string[]> }>()

/** What each module of `modules` (absolute) uses: the modules of its context its `<m>.deps.ts` imports. */
export function declaredModuleUses(modules: string): Record<string, string[]> {
  const isFolder = statSync(modules, { throwIfNoEntry: false })?.isDirectory() ?? false
  const entries = isFolder ? readdirSync(modules, { withFileTypes: true }) : []
  const names = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  const files = names.map(name => posix.join(modules, name, `${name}.deps.ts`))
  const stamp = files.map(file => `${file}:${statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0}`).join(' ')
  const known = declared.get(modules)
  if (known?.stamp === stamp) return known.uses
  const uses: Record<string, string[]> = {}
  names.forEach((name, at) => {
    const file = files[at]!
    const text = statSync(file, { throwIfNoEntry: false })?.isFile() ? readFileSync(file, 'utf8') : ''
    const imported = ts.preProcessFile(text, true, true).importedFiles.map(each => each.fileName).filter(specifier => specifier.startsWith('.'))
    const inModules = imported.map(specifier => target(file, specifier)).filter(path => path.startsWith(`${modules}/`))
    const others = inModules.map(path => path.slice(modules.length + 1).split('/')[0]!)
    uses[name] = [...new Set(others.filter(other => other !== name && names.includes(other)))].sort()
  })
  declared.set(modules, { stamp, uses })
  return uses
}

/** A path of modules from `from` to `to` through what each uses, `from` and `to` among them; `null` when `to` is not reached. */
function pathOf(uses: Record<string, string[]>, from: string, to: string, seen = new Set<string>()): string[] | null {
  if (from === to) return [to]
  if (seen.has(from)) return null
  seen.add(from)
  for (const next of uses[from] ?? []) {
    const rest = pathOf(uses, next, to, seen)
    if (rest) return [from, ...rest]
  }
  return null
}

/**
 * A module reaches another of its context only through its API: its use cases, through
 * the dependency `newt add deps` gives it (`this.deps.folder.get(…)`), and their
 * contract. From another module it imports only types of its module, its schema (the
 * DTOs) and its events (it subscribes to them through the dependency,
 * `folder.events.created`), and its errors, which it may tell apart with `instanceof`.
 * Its schemas as values, its entity, value objects, repository, routes, workers and
 * services are its own: through them a module would read, write, build or parse
 * another's data behind its back. An id a module keeps of another's entity is a value
 * object of its own. A file of no module (a context's composition, a shared file) may
 * import what it needs, but re-exports only that API, as the modules import it. The
 * modules of a context never use each other in a cycle, as their `<m>.deps.ts` say.
 */
export const moduleImports: TSESLint.RuleModule<'private' | 'type' | 'barrel' | 'cycle'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A module reaches another only through its API: types of its module, schema and events, and its errors." },
    messages: {
      private: "'{{path}}' is {{module}}'s own. Reach {{module}} through its use cases, the dependency `newt add deps` gives (this.deps.{{camel}}), and import of it only types of {{module}}.module.ts, {{module}}.schema.ts and events/, and its errors/; an id of its entity is a value object of this module's own.",
      type: "'{{path}}' is part of {{module}}'s API as types alone: `import type`. Call {{module}}'s use cases through this.deps.{{camel}} and subscribe to its events through it ({{camel}}.events.…); an id of its entity is a value object of this module's own.",
      cycle: "{{cycle}}: the modules of a context never use each other in a cycle. Keep one direction and drop the import that closes it; where the module that lost it called the other, it emits an event instead, and the other reacts to it.",
      barrel: "This re-exports '{{path}}' as {{module}} does not offer it: outside the modules, a file re-exports only a module's API, the types of {{module}}.module.ts, {{module}}.schema.ts and events/ (`export type`), and its errors/.",
    },
    schema: [],
  },
  create(context) {
    const root = rootOf(context)
    const place = modulePlace(context.filename, root)
    /** What is wrong with naming `specifier` from `node`: nothing (`null`), or that it is the other module's own, or one of its types brought as a value. */
    const problemOf = (node: TSESTree.Node, specifier: string) => {
      const path = resolved(context, specifier)
      if (!path) return null
      const imported = modulePlace(path, root)
      if (!imported) return null
      if (place && sameModule(imported, place)) return null
      // Another context's modules are reached as it publishes them: newt/published-modules says so.
      if (place && imported.context !== place.context) return null
      if (API_VALUES.test(imported.inside)) return null
      if (!API_TYPES.test(imported.inside)) return { imported, messageId: 'private' as const }
      return isTypeOnly(node) ? null : { imported, messageId: 'type' as const }
    }
    const dataOf = (path: string, module: string) => ({ path, module, camel: camelCase(module) })
    if (!place) {
      const reexport = (node: TSESTree.ExportAllDeclaration | TSESTree.ExportNamedDeclaration) => {
        if (node.source?.type !== 'Literal' || typeof node.source.value !== 'string') return
        const problem = problemOf(node.source, node.source.value)
        if (problem) context.report({ node: node.source, messageId: 'barrel', data: dataOf(node.source.value, problem.imported.module) })
      }
      return { ExportAllDeclaration: reexport, ExportNamedDeclaration: reexport }
    }
    const isDeps = place.inside === `${place.module}.deps.ts`
    const modules = posix.dirname(real(slashed(context.filename)).slice(0, -place.inside.length - 1))
    return importsOf((node, specifier) => {
      const problem = problemOf(node, specifier)
      if (problem) {
        context.report({ node, messageId: problem.messageId, data: dataOf(specifier, problem.imported.module) })
        return
      }
      const path = resolved(context, specifier)
      const imported = path && modulePlace(path, root)
      if (!isDeps || !imported || imported.context !== place.context || sameModule(imported, place)) return
      const back = pathOf(declaredModuleUses(modules), imported.module, place.module)
      if (back) context.report({ node, messageId: 'cycle', data: { cycle: [place.module, ...back].join(' → ') } })
    })
  },
}
