import { TSESLint }        from '@typescript-eslint/utils'
import { TSESTree }        from '@typescript-eslint/utils'
// --------------------------------------------------------
import { isTypeOnly }      from '../../ast/ast'
import { camelCase }       from '../../paths/paths'
import { featureFolderOf } from '../../paths/paths'
import { importsOf }       from '../../paths/paths'
import { modulePlace }     from '../../paths/paths'
import { resolved }        from '../../paths/paths'
import { rootOf }          from '../../paths/paths'
import { sameModule }      from '../../paths/paths'

/** What a module offers the others as types alone: its module (the type of the dependency it is given), its DTOs and what it tells. */
const TYPES = /^(?:[^/]+\.module|[^/]+\.schema|events\/.+)$/

/** What a module offers the others as it is: how its use cases fail, to tell one known error from another. */
const VALUES = /^errors\/.+$/

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
 * import what it needs, but re-exports only that API, as the modules import it.
 */
export const moduleImports: TSESLint.RuleModule<'private' | 'type' | 'barrel'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A module reaches another only through its API: types of its module, schema and events, and its errors." },
    messages: {
      private: "'{{path}}' is {{module}}'s own. Reach {{module}} through its use cases, the dependency `newt add deps` gives (this.deps.{{camel}}), and import of it only types of {{module}}.module.ts, {{module}}.schema.ts and events/, and its errors/; an id of its entity is a value object of this module's own.",
      type: "'{{path}}' is part of {{module}}'s API as types alone: `import type`. Call {{module}}'s use cases through this.deps.{{camel}} and subscribe to its events through it ({{camel}}.events.…); an id of its entity is a value object of this module's own.",
      barrel: "This re-exports '{{path}}' as {{module}} does not offer it: outside the modules, a file re-exports only a module's API, the types of {{module}}.module.ts, {{module}}.schema.ts and events/ (`export type`), and its errors/.",
    },
    schema: [],
  },
  create(context) {
    const root = rootOf(context)
    const place = modulePlace(context.filename, root)
    const ownFeature = place ? place.feature : featureFolderOf(context.filename, root)
    /** What is wrong with naming `specifier` from `node`: nothing (`null`), or that it is the other module's own, or one of its types brought as a value. */
    const problemOf = (node: TSESTree.Node, specifier: string) => {
      const path = resolved(context, specifier)
      if (!path) return null
      const imported = modulePlace(path, root) ?? modulePlace(`${path}/index`, root)
      if (!imported) return null
      if (place && sameModule(imported, place)) return null
      // Another feature's modules are reached through its entry point alone: newt/feature-imports says so.
      if (imported.feature !== ownFeature) return null
      if (VALUES.test(imported.inside)) return null
      if (!TYPES.test(imported.inside)) return { imported, messageId: 'private' as const }
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
    return importsOf((node, specifier) => {
      const problem = problemOf(node, specifier)
      if (problem) context.report({ node, messageId: problem.messageId, data: dataOf(specifier, problem.imported.module) })
    })
  },
}
