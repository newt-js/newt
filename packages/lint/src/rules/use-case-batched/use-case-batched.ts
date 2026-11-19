import { TSESLint } from '@typescript-eslint/utils'
import { TSESTree } from '@typescript-eslint/utils'
import { posix }    from 'node:path'
// --------------------------------------------------------
import { slashed }  from '../../paths/paths'

/** The methods of a list that call their callback once per item. */
const PER_ITEM = new Set([
  'map', 'flatMap', 'forEach', 'filter', 'reduce', 'reduceRight',
  'some', 'every', 'find', 'findIndex', 'findLast', 'findLastIndex',
])

/** Whether a call is to another module's use case: `this.deps.<module>.<use case>(…)`, through any members. */
function callsDeps(call: TSESTree.CallExpression): boolean {
  let node: TSESTree.Node = call.callee
  while (node.type === 'MemberExpression') {
    const object: TSESTree.Expression = node.object
    if (object.type === 'MemberExpression' && object.object.type === 'ThisExpression' && !object.computed
      && object.property.type === 'Identifier' && object.property.name === 'deps') return true
    node = object
  }
  return false
}

/** The name of the list's method a callback is given to, when that method runs it once per item. */
function perItemMethod(callback: TSESTree.Node, parent: TSESTree.Node): string | null {
  if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') return null
  if (parent.type !== 'CallExpression' || !parent.arguments.some(argument => argument === callback)) return null
  const callee: TSESTree.Expression = parent.callee
  if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier') return null
  return PER_ITEM.has(callee.property.name) ? callee.property.name : null
}

/** The loop a statement is, when the node reached from `child` runs once per turn of it: `null` when it runs once. */
function loopOf(loop: TSESTree.Node, child: TSESTree.Node): string | null {
  switch (loop.type) {
    case 'ForOfStatement': return loop.right === child ? null : 'for…of'
    case 'ForInStatement': return loop.right === child ? null : 'for…in'
    case 'ForStatement': return loop.init === child ? null : 'for'
    case 'WhileStatement': return 'while'
    case 'DoWhileStatement': return 'do…while'
    default: return null
  }
}

/** The loop, or the call that runs a callback once per item, a node runs in, within its method: `null` for none. */
function perItem(node: TSESTree.Node): string | null {
  let child: TSESTree.Node = node
  let parent: TSESTree.Node | undefined = node.parent
  while (parent) {
    if (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') return null
    const loop = loopOf(parent, child)
    if (loop) return loop
    const method = perItemMethod(child, parent)
    if (method) return `.${method}()`
    child = parent
    parent = parent.parent
  }
  return null
}

/**
 * Another module's use case is called once for a batch, never once per item: in a `*.module.ts`, a call to
 * `this.deps.<module>.<use case>` is never inside a loop or a callback a list runs per item (`map`, `forEach`,
 * `flatMap`, `filter`, `reduce`…). The products of an order's lines are one `find` with every id
 * (`{ field: 'id', op: 'in', value: ids }`), taken each with `referenced`; never one `get` per line.
 */
export const useCaseBatched: TSESLint.RuleModule<'perItem'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "Another module's use case is called once for a batch, never once per item." },
    messages: {
      perItem: "'{{call}}' runs once per item, in a {{loop}}: one call to another module per item. Call it once, before, with every id (find({ field: 'id', op: 'in', value: ids })), and take each one with `referenced(found, id, name)`.",
    },
    schema: [],
  },
  create(context) {
    if (!posix.basename(slashed(context.filename)).endsWith('.module.ts')) return {}
    return {
      CallExpression(call) {
        if (!callsDeps(call)) return
        const loop = perItem(call)
        if (loop) context.report({ node: call, messageId: 'perItem', data: { call: context.sourceCode.getText(call.callee), loop } })
      },
    }
  },
}
