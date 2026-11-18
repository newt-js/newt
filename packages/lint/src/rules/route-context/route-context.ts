import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { TSESLint }                               from '@typescript-eslint/utils'
import type { TSESTree }                          from '@typescript-eslint/utils'
import { default as ts }                          from 'typescript'
// --------------------------------------------------------
import { textOf }                                 from '../../ast/ast'
import { ROOT }                                   from '../../paths/paths'
import { absolute }                               from '../../paths/paths'
import { contextOf }                              from '../../paths/paths'
import { modulePlace }                            from '../../paths/paths'
import { real }                                   from '../../paths/paths'
import { rootOf }                                 from '../../paths/paths'

/** What registers a route on a router or a group. */
const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete'])

/** What TypeScript calls newt's routers. */
const ROUTERS = new Set(['HttpRouter', 'HttpGroup'])

/** Without types, a router is `router`, or a parameter given the type HttpRouter. */
function isRouterByName(node: TSESTree.Node, routers: Set<string>): boolean {
  return node.type === 'Identifier' && routers.has(node.name)
}

function isRouterParameter(node: TSESTree.Parameter): node is TSESTree.Identifier {
  if (node.type !== 'Identifier') return false
  const annotation = node.typeAnnotation?.typeAnnotation
  return annotation?.type === 'TSTypeReference' && annotation.typeName.type === 'Identifier' && annotation.typeName.name === 'HttpRouter'
}

/** The text a path is, read through consts, templates and `+`: undefined when it cannot be read. */
function textIn(checker: ts.TypeChecker, node: ts.Node, seen = new Set<ts.Node>()): string | undefined {
  if (seen.has(node)) return undefined
  seen.add(node)
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return textIn(checker, node.expression, seen)
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text
    for (const span of node.templateSpans) {
      const part = textIn(checker, span.expression, seen)
      if (part === undefined) return undefined
      text += part + span.literal.text
    }
    return text
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = textIn(checker, node.left, seen)
    const right = textIn(checker, node.right, seen)
    return left === undefined || right === undefined ? undefined : left + right
  }
  const initializer = constInitializer(checker, node)
  if (initializer) return textIn(checker, initializer, seen)
  const type = checker.getTypeAtLocation(node)
  return type.isStringLiteral() ? type.value : undefined
}

/** What a const, or a property of an object a const holds, was given. */
function constInitializer(checker: ts.TypeChecker, node: ts.Node): ts.Expression | undefined {
  if (!ts.isIdentifier(node) && !ts.isPropertyAccessExpression(node)) return undefined
  let symbol = checker.getSymbolAtLocation(node)
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol)
  const declaration = symbol?.valueDeclaration
  if (!declaration) return undefined
  if (ts.isVariableDeclaration(declaration) && ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.Const) return declaration.initializer
  if (ts.isPropertyAssignment(declaration)) return declaration.initializer
  return undefined
}

/** The prefix a router's routes take: a group's, followed through the consts that hold it; '' for a router given. */
function prefixOf(checker: ts.TypeChecker, node: ts.Expression, seen = new Set<ts.Node>()): string | undefined {
  if (seen.has(node)) return ''
  seen.add(node)
  if (ts.isParenthesizedExpression(node)) return prefixOf(checker, node.expression, seen)
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'group') {
    const outer = prefixOf(checker, node.expression.expression, seen)
    const own = node.arguments[0] && textIn(checker, node.arguments[0])
    return outer === undefined || own === undefined ? undefined : outer + own
  }
  const initializer = ts.isIdentifier(node) ? constInitializer(checker, node) : undefined
  return initializer ? prefixOf(checker, initializer, seen) : ''
}

export type RouteContextOptions = [{ folder?: string }]

/**
 * A context's routes do not repeat its name: its router already serves them under
 * `/shop/api`, so `/shop/orders` would answer at `/shop/api/shop/orders`. Every route a
 * context's files register, on a router or on a group, whose prefix is followed; a path
 * is read through its consts and templates, and one that cannot be read is let be.
 */
export const routeContext: TSESLint.RuleModule<'context', RouteContextOptions> = {
  defaultOptions: [{}],
  meta: {
    type: 'problem',
    docs: { description: "A context's routes do not repeat its name." },
    messages: {
      context: "'{{path}}' starts with /{{context}}: the router already serves a context's routes under /{{context}}/api, so write it as {{without}}.",
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, additionalProperties: false }],
  },
  create(context) {
    if (context.filename.endsWith('.test.ts')) return {}
    const folder = context.options[0]?.folder
    const root = rootOf(context)
    const found = folder === undefined ? modulePlace(context.filename, root)?.context : contextOf(context.physicalFilename, real(absolute(folder, root)))
    if (!found || found === '.' || found === ROOT) return {}
    const own = found
    const services = context.sourceCode.parserServices as Partial<ParserServicesWithTypeInformation> | undefined
    const checker = services?.program?.getTypeChecker()
    const map = services?.esTreeNodeToTSNodeMap
    const routers = new Set(['router'])
    const isRouter = (node: TSESTree.Expression) => {
      if (!checker || !map) return isRouterByName(node, routers)
      const type = checker.getTypeAtLocation(map.get(node))
      return ROUTERS.has((type.aliasSymbol ?? type.getSymbol())?.getName() ?? '')
    }
    const pathOf = (node: TSESTree.CallExpression, router: TSESTree.Expression) => {
      if (!checker || !map) return textOf(node.arguments[0])
      const prefix = prefixOf(checker, map.get(router) as ts.Expression)
      const path = node.arguments[0] && textIn(checker, map.get(node.arguments[0]))
      return prefix === undefined || path === undefined ? undefined : prefix + path
    }
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node: TSESTree.FunctionLike) {
        for (const parameter of node.params) if (isRouterParameter(parameter)) routers.add(parameter.name)
      },
      CallExpression(node: TSESTree.CallExpression) {
        const { callee } = node
        if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier') return
        // Without types, a group's prefix is checked in the stead of its routes, which it cannot follow.
        if (!METHODS.has(callee.property.name) && (checker || callee.property.name !== 'group')) return
        if (!node.arguments[0] || !isRouter(callee.object)) return
        const path = pathOf(node, callee.object)
        const repeatsContext = path === `/${own}` || path?.startsWith(`/${own}/`)
        if (!path || !repeatsContext) return
        const without = path.slice(own.length + 1) || '/'
        context.report({ node: node.arguments[0], messageId: 'context', data: { path, context: own, without } })
      },
    }
  },
}
