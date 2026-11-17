import { TSESLint }     from '@typescript-eslint/utils'
import { TSESTree }     from '@typescript-eslint/utils'
import { posix }        from 'node:path'
// --------------------------------------------------------
import type { Context } from '../../paths/paths'
import { slashed }      from '../../paths/paths'

const FUNCTIONS = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'])

/** Whether `name`, where `node` is, is the first parameter of the nearest function around it: the handler's request. */
function isRequest(context: Context, node: TSESTree.Node, name: string): boolean {
  let fn = node.parent
  while (fn && !FUNCTIONS.has(fn.type)) fn = fn.parent
  const first = (fn as TSESTree.FunctionLike | undefined)?.params[0]
  if (first?.type !== 'Identifier') return false
  for (let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(name)
    if (variable) return variable.defs.some(def => def.type === TSESLint.Scope.DefinitionType.Parameter && def.name === first)
  }
  return false
}

/** `request.json()` or `await request.json()`, whatever the handler calls its request. What an upstream call answered is not one. */
function isBody(context: Context, node: TSESTree.Node | null | undefined): boolean {
  const call = node?.type === 'AwaitExpression' ? node.argument : node
  if (call?.type !== 'CallExpression' || call.arguments.length !== 0) return false
  const { callee } = call
  return callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && callee.property.name === 'json'
    && callee.object.type === 'Identifier' && isRequest(context, call, callee.object.name)
}

/** A type that says something of the body: anything but `unknown`. */
const claims = (type: TSESTree.TypeNode | undefined): type is TSESTree.TypeNode => type !== undefined && type.type !== 'TSUnknownKeyword'

/**
 * A route hands the body to a use case as it came, and the use case parses it: in a
 * `*.routes.ts`, `await request.json() as X` (or `<X>`, or `const body: X = await
 * request.json()`) says the body is an X before anything checked it, so a use case that
 * forgot to parse would get it unchecked, and the compiler would not tell.
 */
export const routeBodyUnchecked: TSESLint.RuleModule<'body'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A route passes the body to a use case as it came; it never asserts its type.' },
    messages: {
      body: "The body is not {{type}} until something parses it: pass `await bodyOf(request)` as it came to a use case typed with its input DTO, which parses it with that DTO's schema.",
    },
    schema: [],
  },
  create(context) {
    if (!posix.basename(slashed(context.filename)).endsWith('.routes.ts')) return {}
    const report = (node: TSESTree.Node, type: TSESTree.TypeNode) => context.report({ node, messageId: 'body', data: { type: context.sourceCode.getText(type) } })
    const asserted = (node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion) => {
      if (isBody(context, node.expression) && claims(node.typeAnnotation)) report(node, node.typeAnnotation)
    }
    return {
      TSAsExpression: asserted,
      TSTypeAssertion: asserted,
      VariableDeclarator(node) {
        const type = node.id.typeAnnotation?.typeAnnotation
        if (isBody(context, node.init) && claims(type)) report(node, type)
      },
    }
  },
}
