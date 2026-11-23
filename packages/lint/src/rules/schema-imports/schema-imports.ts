import { TSESLint }      from '@typescript-eslint/utils'
// --------------------------------------------------------
import { CORE }          from '../../ast/ast'
import { isTypeOnly }    from '../../ast/ast'
import { importsOf }     from '../../paths/paths'
import { isModuleEntry } from '../../paths/paths'
import { modulePlace }   from '../../paths/paths'
import { resolved }      from '../../paths/paths'
import { rootOf }        from '../../paths/paths'
import { sameModule }    from '../../paths/paths'

/** The packages a schema may import: zod, to write it, and newt's core, for its value objects, filters and pages. */
const PACKAGES = new Set(['zod', CORE])

/**
 * A module's schema (`<m>.schema.ts`) is its contract: the DTOs its use cases take and
 * give, and what its callers share with it. It says what the data is, so it is made only
 * of zod, newt's core (value objects, `defineFilter`, `Page`, `PageRequest`), the
 * module's own value objects and other modules' DTOs: never the entity, the
 * repository, the module or any other file, which would make the contract depend on how
 * the module works. Of another module it takes only DTO types, from its `index.ts`
 * (`import type`).
 */
export const schemaImports: TSESLint.RuleModule<'package' | 'file' | 'type'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A module's schema imports only zod, @newt-js/core, its value objects and other modules' DTO types." },
    messages: {
      package: "'{{path}}' is not part of a contract: {{file}} imports only 'zod' and '@newt-js/core' (its root, not an adapter's entry). Move what needs it out of the schema.",
      file: "'{{path}}' is not part of a contract: {{file}} imports only the module's value objects (value-objects/) and other modules' DTO types (import type from the module's folder, its index.ts). The DTO says what the data is; how the module works stays out of it.",
      type: "'{{path}}' is another module: {{file}} takes only its DTO types, `import type`.",
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
      const own = imported !== null && sameModule(imported, place)
      const contract = imported && (own ? imported.inside.startsWith('value-objects/') : isModuleEntry(imported.inside))
      if (!contract) {
        context.report({ node, messageId: 'file', data: { path: specifier, file: place.inside } })
        return
      }
      if (!own && !isTypeOnly(node)) context.report({ node, messageId: 'type', data: { path: specifier, file: place.inside } })
    })
  },
}
