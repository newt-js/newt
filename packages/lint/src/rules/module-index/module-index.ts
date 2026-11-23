import { TSESLint }    from '@typescript-eslint/utils'
import { TSESTree }    from '@typescript-eslint/utils'
// --------------------------------------------------------
import { modulePlace } from '../../paths/paths'
import { rootOf }      from '../../paths/paths'

/** A name that checks the data rather than says what it is: a zod schema, or a filter. */
const CHECKS = /(?:Schema|Filter)$/

/** Whether a re-export brings its names as types alone: `export type { … }`, or each name `type`. */
function isTypeOnly(node: TSESTree.ExportNamedDeclaration): boolean {
  return node.exportKind === 'type' || (node.specifiers.length > 0 && node.specifiers.every(specifier => specifier.exportKind === 'type'))
}

/** The name a re-export offers each thing by. */
function offered(specifier: TSESTree.ExportSpecifier): string {
  return specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value
}

/**
 * A module's `index.ts` is what it offers the others, name by name, and the only file of it
 * they import (`newt/module-imports`). It only re-exports: as types, its module
 * (`<m>.module`, the type of the dependency it is given), the DTOs of its schema
 * (`<m>.schema`, never a schema or a filter: how it checks the data is its own) and of its
 * events (`events/`); and its errors (`errors/`), the only values, which a caller tells
 * apart with `instanceof`. Never `export *`: a name goes out only when it is written here.
 */
export const moduleIndex: TSESLint.RuleModule<'statement' | 'all' | 'type' | 'check' | 'source'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A module's index.ts re-exports, name by name, the types of its module, schema and events, and its errors." },
    messages: {
      statement: "{{module}}'s index.ts only re-exports what {{module}} offers, name by name: `export type { … } from './{{module}}.schema'`, `'./{{module}}.module'` or `'./events/…'`, and `export { … } from './errors/…'`. Write the code in the file it belongs to.",
      all: "`export *` would offer whatever '{{path}}' gains: name each thing {{module}} offers.",
      type: "'{{path}}' is offered as types alone: `export type { … }`, so no server code goes with it.",
      check: "'{{name}}' checks the data: {{module}} offers its DTOs, never how it checks them.",
      source: "'{{path}}' is {{module}}'s own: its index.ts offers only the types of {{module}}.module.ts, {{module}}.schema.ts and events/, and its errors/.",
    },
    schema: [],
  },
  create(context) {
    const place = modulePlace(context.filename, rootOf(context))
    if (!place || place.inside !== 'index.ts') return {}
    const { module } = place
    const typesFrom = (path: string) => path === `./${module}.schema` || path === `./${module}.module` || /^\.\/events\/[^/]+$/.test(path)
    return {
      Program(program) {
        for (const node of program.body) {
          if (node.type === 'ExportAllDeclaration') {
            context.report({ node, messageId: 'all', data: { module, path: node.source.value } })
            continue
          }
          if (node.type !== 'ExportNamedDeclaration' || node.source === null) {
            context.report({ node, messageId: 'statement', data: { module } })
            continue
          }
          const path = node.source.value.replace(/\.[cm]?[jt]sx?$/, '')
          if (/^\.\/errors\/[^/]+$/.test(path)) continue
          if (!typesFrom(path)) {
            context.report({ node: node.source, messageId: 'source', data: { module, path } })
            continue
          }
          if (!isTypeOnly(node)) {
            context.report({ node, messageId: 'type', data: { path } })
            continue
          }
          for (const specifier of node.specifiers) {
            const name = offered(specifier)
            if (CHECKS.test(name)) context.report({ node: specifier, messageId: 'check', data: { module, name } })
          }
        }
      },
    }
  },
}
