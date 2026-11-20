import { TSESLint }     from '@typescript-eslint/utils'
import { TSESTree }     from '@typescript-eslint/utils'
import { posix }        from 'node:path'
// --------------------------------------------------------
import type { Context } from '../../paths/paths'
import { slashed }      from '../../paths/paths'

/** The methods of a route that writes: a GET only reads. */
const WRITES = new Set(['post', 'put', 'patch', 'delete'])

/** The options a route was given, written in place or in a `const` of the file; null if they cannot be seen. */
function optionsOf(context: Context, node: TSESTree.Node | undefined): TSESTree.ObjectExpression | null {
  if (node?.type === 'ObjectExpression') return node
  if (node?.type !== 'Identifier') return null
  for (let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name)
    if (variable) {
      const def = variable.defs[0]?.node
      return def?.type === 'VariableDeclarator' && def.init?.type === 'ObjectExpression' ? def.init : null
    }
  }
  return null
}

const keyOf = (property: TSESTree.Property): string | null =>
  property.key.type === 'Identifier' ? property.key.name : property.key.type === 'Literal' ? String(property.key.value) : null

/**
 * A public route that writes takes a rate limit: anyone can call it without a session, and each call writes, so with no
 * limit a script fills the database or tries passwords at will. In a `*.routes.ts`, `router.post(path, handler,
 * { public: true })` without `rateLimit` among its options.
 */
export const routePublicRateLimit: TSESLint.RuleModule<'limit'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A public route that writes takes a rate limit.' },
    messages: {
      limit: 'A public {{method}} writes for anyone without a session: give it a `rateLimit` (`{ limit: rateLimits.define(…), by: \'ip\' }`) among its options.',
    },
    schema: [],
  },
  create(context) {
    if (!posix.basename(slashed(context.filename)).endsWith('.routes.ts')) return {}
    return {
      CallExpression(node) {
        const { callee } = node
        if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier') return
        const method = callee.property.name
        if (!WRITES.has(method) || node.arguments.length < 3) return
        const options = optionsOf(context, node.arguments[2])
        // Options it cannot see, or spread from elsewhere: it says nothing of them.
        if (!options || options.properties.some(each => each.type !== 'Property')) return
        const properties = options.properties as TSESTree.Property[]
        const isPublic = properties.some(each => keyOf(each) === 'public' && each.value.type === 'Literal' && each.value.value === true)
        const limited = properties.some(each => keyOf(each) === 'rateLimit')
        if (isPublic && !limited) context.report({ node: options, messageId: 'limit', data: { method: method.toUpperCase() } })
      },
    }
  },
}
