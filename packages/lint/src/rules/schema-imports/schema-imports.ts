import { TSESLint }    from '@typescript-eslint/utils'
// --------------------------------------------------------
import { CORE }        from '../../ast/ast'
import { importsOf }   from '../../paths/paths'
import { modulePlace } from '../../paths/paths'
import { resolved }    from '../../paths/paths'
import { rootOf }      from '../../paths/paths'

/** The packages a schema may import: zod, to write it, and newt's core, for its value objects, filters and pages. */
const PACKAGES = new Set(['zod', CORE])

/**
 * A module's schema (`<m>.schema.ts`) is its contract: the DTOs its use cases take and
 * give, and what its callers share with it. It says what the data is, so it is made only
 * of zod, newt's core (value objects, `defineFilter`, `Page`, `PageRequest`), the
 * module's own value objects and other modules' schemas: never the entity, the
 * repository, the module or any other file, which would make the contract depend on how
 * the module works.
 */
export const schemaImports: TSESLint.RuleModule<'package' | 'file'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A module's schema imports only zod, @newt-js/core, its value objects and other schemas." },
    messages: {
      package: "'{{path}}' is not part of a contract: {{file}} imports only 'zod' and '@newt-js/core' (its root, not an adapter's entry). Move what needs it out of the schema.",
      file: "'{{path}}' is not part of a contract: {{file}} imports only the module's value objects (value-objects/) and other modules' schemas (*.schema.ts). The DTO says what the data is; how the module works stays out of it.",
    },
    schema: [],
  },
  create(context) {
    const root = rootOf(context)
    const place = modulePlace(context.filename, root)
    if (!place || place.inside !== `${place.module}.schema.ts`) return {}
    return importsOf((node, specifier) => {
      const path = resolved(context, specifier)
      if (path === null) {
        if (!PACKAGES.has(specifier)) context.report({ node, messageId: 'package', data: { path: specifier, file: place.inside } })
        return
      }
      const imported = modulePlace(path, root)
      const own = imported?.context === place.context && imported.module === place.module
      const contract = imported && (own ? imported.inside.startsWith('value-objects/') : /^[^/]+\.schema$/.test(imported.inside))
      if (!contract) context.report({ node, messageId: 'file', data: { path: specifier, file: place.inside } })
    })
  },
}
