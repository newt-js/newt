import { TSESLint } from '@typescript-eslint/utils'
import { TSESTree } from '@typescript-eslint/utils'

/** Every node under `node`, itself first, but the functions inside it: what they do runs some other time. */
function* under(node: TSESTree.Node): Generator<TSESTree.Node> {
  yield node
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && typeof (child as TSESTree.Node).type === 'string') yield* under(child as TSESTree.Node)
    }
  }
}

/** A call to `this.<name>(…)`. */
const callsThis = (node: TSESTree.Node, name: string): node is TSESTree.CallExpression => node.type === 'CallExpression'
  && node.callee.type === 'MemberExpression' && node.callee.object.type === 'ThisExpression'
  && !node.callee.computed && node.callee.property.type === 'Identifier' && node.callee.property.name === name

/** `this.trackEvent(new <Entity>_Updated(…))`. */
const tracksUpdated = (node: TSESTree.Node) => callsThis(node, 'trackEvent')
  && node.arguments[0]?.type === 'NewExpression' && node.arguments[0].callee.type === 'Identifier' && node.arguments[0].callee.name.endsWith('_Updated')

/**
 * An entity that changes says so: a method of a class that extends `Entity` and calls `this.change(…)` tracks its
 * `<Entity>_Updated` too, `this.trackEvent(new <Entity>_Updated(…))`, besides any event that names what changed
 * (`renamed`, `ended`…). Who wants to know of every change of it listens to one event.
 */
export const entityUpdated: TSESLint.RuleModule<'notTold'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'An entity that changes tracks its <Entity>_Updated.' },
    messages: {
      notTold: "'{{method}}' changes the entity but does not say so: track its updated event too, this.trackEvent(new <Entity>_Updated(…)), besides any event that names what changed.",
    },
    schema: [],
  },
  create(context) {
    return {
      'ClassDeclaration[superClass.name="Entity"] > ClassBody > MethodDefinition'(method: TSESTree.MethodDefinition) {
        const body = method.value.body
        if (!body || method.key.type !== 'Identifier') return
        const nodes = [...under(body)]
        if (!nodes.some(each => callsThis(each, 'change'))) return
        if (!nodes.some(tracksUpdated)) context.report({ node: method.key, messageId: 'notTold', data: { method: method.key.name } })
      },
    }
  },
}
