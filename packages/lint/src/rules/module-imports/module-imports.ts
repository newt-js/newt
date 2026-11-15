import { TSESLint }    from '@typescript-eslint/utils'
import { TSESTree }    from '@typescript-eslint/utils'
// --------------------------------------------------------
import { importsOf }   from '../../paths/paths'
import { modulePlace } from '../../paths/paths'
import { resolved }    from '../../paths/paths'
import { rootOf }      from '../../paths/paths'

/** What a module offers the others: its use cases' module, its contract, what it tells and how it fails. */
const PUBLIC = /^(?:[^/]+\.module|[^/]+\.schema|events\/.+|errors\/.+)$/

/**
 * A module reaches another only through what that one offers: its module (to call its
 * use cases), its schema, its events and its errors. Its entity, value objects,
 * repository, routes and workers are its own: through them a module would read or write
 * another's data behind its back. An id a module keeps of another's entity is a value
 * object of its own. A file of no module (a context's composition, a shared file) may
 * import what it needs, but re-exports only what a module offers.
 */
export const moduleImports: TSESLint.RuleModule<'private' | 'barrel'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A module imports from another only its module, schema, events and errors.' },
    messages: {
      private: "'{{path}}' is {{module}}'s own. Reach {{module}} through its use cases ({{module}}.module.ts), its schema, its events or its errors; an id of its entity is a value object of this module's own.",
      barrel: "This re-exports '{{path}}', {{module}}'s own file: outside the modules, a file re-exports only what a module offers, its use cases ({{module}}.module.ts), its schema, its events and its errors.",
    },
    schema: [],
  },
  create(context) {
    const root = rootOf(context)
    const place = modulePlace(context.filename, root)
    const privateOf = (specifier: string) => {
      const path = resolved(context, specifier)
      if (!path) return null
      const imported = modulePlace(path, root) ?? modulePlace(`${path}/index`, root)
      if (!imported || PUBLIC.test(imported.inside)) return null
      return place && imported.context === place.context && imported.module === place.module ? null : imported
    }
    if (!place) {
      const reexport = (node: TSESTree.ExportAllDeclaration | TSESTree.ExportNamedDeclaration) => {
        if (node.source?.type !== 'Literal' || typeof node.source.value !== 'string') return
        const imported = privateOf(node.source.value)
        if (imported) context.report({ node: node.source, messageId: 'barrel', data: { path: node.source.value, module: imported.module } })
      }
      return { ExportAllDeclaration: reexport, ExportNamedDeclaration: reexport }
    }
    return importsOf((node, specifier) => {
      const imported = privateOf(specifier)
      if (imported) context.report({ node, messageId: 'private', data: { path: specifier, module: imported.module } })
    })
  },
}
