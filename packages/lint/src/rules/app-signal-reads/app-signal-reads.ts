import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { TSESLint }                               from '@typescript-eslint/utils'
import { TSESTree }                               from '@typescript-eslint/utils'
// --------------------------------------------------------
import { appPlaceOf }                             from '../../paths/paths'

type Fn = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression

const COMPONENT_NAME = /^[A-Z]/

/** The name a function is known by: its own, or the variable it is assigned to. */
function nameOf(node: Fn): string | null {
  if (node.type !== 'ArrowFunctionExpression' && node.id) return node.id.name
  return node.parent.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier' ? node.parent.id.name : null
}

/** The closest function around a node. */
function functionOf(node: TSESTree.Node): Fn | null {
  for (let at = node.parent; at; at = at.parent) {
    if (at.type === 'FunctionDeclaration' || at.type === 'FunctionExpression' || at.type === 'ArrowFunctionExpression') return at
  }
  return null
}

/**
 * A component paints what `useValue` hands it: a signal's `.value` read while it renders gives a value that
 * never repaints it. Outside render (a handler, an effect) `.value` is fine. With types, only a signal's `.value`
 * counts; without them, any `.value` read right in a component's body.
 */
export const appSignalReads: TSESLint.RuleModule<'render', [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A component of a context's app reads a signal with useValue, never its .value while it renders." },
    messages: {
      render: "`.value` read while {{name}} renders gives a value that never repaints it: read it with `useValue(signal)`. Outside render (a handler, an effect) `.value` is fine.",
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder }] = context.options
    const place = appPlaceOf(context, folder)
    if (!place || !/\.tsx$/.test(place.inside)) return {}
    const services = context.sourceCode.parserServices as Partial<ParserServicesWithTypeInformation> | undefined
    const checker = services?.program?.getTypeChecker()
    const map = services?.esTreeNodeToTSNodeMap
    /** With types, whether it is a signal: what has `peek` and `subscribe`. Without, anything may be. */
    const isSignal = (node: TSESTree.Node) => {
      if (!checker || !map) return true
      const type = checker.getTypeAtLocation(map.get(node))
      return type.getProperty('peek') !== undefined && type.getProperty('subscribe') !== undefined
    }
    return {
      MemberExpression(node) {
        const isValue = !node.computed && node.property.type === 'Identifier' && node.property.name === 'value'
        if (!isValue) return
        const owner = functionOf(node)
        const name = owner && nameOf(owner)
        if (!name || !COMPONENT_NAME.test(name) || !isSignal(node.object)) return
        context.report({ node, messageId: 'render', data: { name } })
      },
    }
  },
}
