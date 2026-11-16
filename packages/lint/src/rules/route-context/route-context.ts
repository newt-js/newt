import { TSESLint }      from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'
// --------------------------------------------------------
import { textOf }        from '../../ast/ast'
import { modulePlace }   from '../../paths/paths'
import { rootOf }        from '../../paths/paths'

/** What registers a path on a router; `group` gives the prefix its routes share, which is checked in their stead. */
const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'group'])

/** A router: `router`, or a parameter given the type HttpRouter. */
function isRouter(node: TSESTree.Node): boolean {
  if (node.type !== 'Identifier') return false
  if (node.name === 'router') return true
  const annotation = node.typeAnnotation?.typeAnnotation
  return annotation?.type === 'TSTypeReference' && annotation.typeName.type === 'Identifier' && annotation.typeName.name === 'HttpRouter'
}

/** A module's routes start with its context, `/shop/orders`: one server serves every context, so paths never clash. */
export const routeContext: TSESLint.RuleModule<'context'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A module's routes start with its context." },
    messages: {
      context: "'{{path}}' does not start with /{{context}}/: a module's routes start with its context, as /{{context}}{{path}}, so two contexts never take the same path.",
    },
    schema: [],
  },
  create(context) {
    const place = modulePlace(context.filename, rootOf(context))
    if (!place || place.context === '.' || place.inside !== `${place.module}.routes.ts`) return {}
    const own = place.context
    const routers = new Set(['router'])
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node: TSESTree.FunctionLike) {
        for (const parameter of node.params) if (isRouter(parameter) && parameter.type === 'Identifier') routers.add(parameter.name)
      },
      CallExpression(node: TSESTree.CallExpression) {
        const { callee } = node
        if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier' || !METHODS.has(callee.property.name)) return
        if (callee.object.type !== 'Identifier' || !routers.has(callee.object.name)) return
        const path = textOf(node.arguments[0])
        if (path === undefined || path === `/${own}` || path.startsWith(`/${own}/`)) return
        context.report({ node: node.arguments[0]!, messageId: 'context', data: { path, context: own } })
      },
    }
  },
}
