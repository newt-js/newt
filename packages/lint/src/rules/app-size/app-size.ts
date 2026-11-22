import { TSESLint }   from '@typescript-eslint/utils'
import { TSESTree }   from '@typescript-eslint/utils'
// --------------------------------------------------------
import { nodes }      from '../../ast/ast'
import { appPlaceOf } from '../../paths/paths'

/** How big a piece may grow before it is two: past these, it is split. */
const LIMITS = {
  componentLines: 100,
  jsxDepth: 4,
  servicesPerComponent: 1,
  valuesPerComponent: 3,
  serviceLines: 150,
  serviceMethods: 7,
  serviceInjects: 3,
}

type MessageId = 'componentLines' | 'jsxDepth' | 'services' | 'values' | 'serviceLines' | 'serviceMethods' | 'serviceInjects'

/** The limit each message is about. */
const LIMIT_OF: Record<MessageId, keyof typeof LIMITS> = {
  componentLines: 'componentLines',
  jsxDepth: 'jsxDepth',
  services: 'servicesPerComponent',
  values: 'valuesPerComponent',
  serviceLines: 'serviceLines',
  serviceMethods: 'serviceMethods',
  serviceInjects: 'serviceInjects',
}

const SERVICE_FILE = /\.service\.ts$/

const COMPONENT_FILE = /\.tsx$/

const COMPONENT_NAME = /^[A-Z]/

/** The lines that hold something: blank lines are not counted. */
const linesOf = (text: string) => text.split('\n').filter(line => line.trim() !== '').length

/** The name a function is known by: its own, or the variable it is assigned to. */
function nameOf(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): string | null {
  if (node.type !== 'ArrowFunctionExpression' && node.id) return node.id.name
  const parent = node.parent
  return parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier' ? parent.id.name : null
}

/** How many JSX elements hold this one, itself included: fragments do not count. */
function depthOf(node: TSESTree.JSXElement): number {
  let depth = 0
  for (let at: TSESTree.Node | undefined = node; at; at = at.parent) if (at.type === 'JSXElement') depth++
  return depth
}

const isPublic = (member: TSESTree.MethodDefinition) =>
  member.kind === 'method' && member.key.type !== 'PrivateIdentifier' && member.accessibility !== 'private' && member.accessibility !== 'protected' && !member.static

/**
 * A context's app keeps its pieces small, and splits one that grows: a component in at most 100 lines, JSX
 * nested 4 deep, one service and 3 values; a service in at most 150 lines, 7 public methods and 3 injected services.
 */
export const appSize: TSESLint.RuleModule<MessageId, [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A context's app keeps its components and services small, and splits one that grows." },
    messages: {
      componentLines: 'This file has {{count}} lines, over {{limit}}: split a part out, in a file named after this one (`<name>-<part>.tsx`).',
      jsxDepth: 'This JSX is nested {{count}} deep, over {{limit}}: make the inner part a component of its own.',
      services: '{{name}} uses {{count}} services, over {{limit}}: a component works for one service; split it, one part per service.',
      values: '{{name}} reads {{count}} values, over {{limit}}: split it, or have the service hand out what it shows as one computed value.',
      serviceLines: 'This service has {{count}} lines, over {{limit}}: split it by part of the feature, each provided where its part is.',
      serviceMethods: '{{name}} has {{count}} public methods, over {{limit}}: it is doing the work of two; split it by part of the feature.',
      serviceInjects: '{{name}} injects {{count}} services, over {{limit}}: it depends on too much; split it, or let an event tell it instead.',
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder }] = context.options
    const place = appPlaceOf(context, folder)
    if (!place) return {}
    const isComponentFile = COMPONENT_FILE.test(place.inside)
    const isServiceFile = SERVICE_FILE.test(place.inside)
    if (!isComponentFile && !isServiceFile) return {}
    const text = context.sourceCode.getText()
    const report = (node: TSESTree.Node, messageId: MessageId, count: number, name = '') =>
      context.report({ node, messageId, data: { count, limit: LIMITS[LIMIT_OF[messageId]], name } })

    type Fn = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
    const components: { node: Fn, name: string, services: number, values: number }[] = []
    const checkComponent = (node: Fn) => {
      const name = nameOf(node)
      if (name && COMPONENT_NAME.test(name)) components.push({ node, name, services: 0, values: 0 })
    }
    const leaveComponent = (node: Fn) => {
      const last = components.at(-1)
      if (last?.node !== node) return
      components.pop()
      if (last.services > LIMITS.servicesPerComponent) report(node, 'services', last.services, last.name)
      if (last.values > LIMITS.valuesPerComponent) report(node, 'values', last.values, last.name)
    }

    if (isServiceFile) {
      return {
        Program(node) {
          const lines = linesOf(text)
          if (lines > LIMITS.serviceLines) report(node, 'serviceLines', lines)
        },
        ClassBody(node) {
          const name = node.parent.type === 'ClassDeclaration' ? node.parent.id?.name ?? 'This service' : 'This service'
          const methods = node.body.filter(member => member.type === 'MethodDefinition' && isPublic(member)).length
          if (methods > LIMITS.serviceMethods) report(node.parent, 'serviceMethods', methods, name)
          const injects = [...nodes(node)].filter(at => at.type === 'CallExpression' && at.callee.type === 'Identifier' && at.callee.name === 'inject').length
          if (injects > LIMITS.serviceInjects) report(node.parent, 'serviceInjects', injects, name)
        },
      }
    }

    return {
      Program(node) {
        const lines = linesOf(text)
        if (lines > LIMITS.componentLines) report(node, 'componentLines', lines)
      },
      JSXElement(node) {
        // Once per branch that goes too deep: at the first element past the limit.
        const depth = depthOf(node)
        if (depth === LIMITS.jsxDepth + 1) report(node, 'jsxDepth', depth)
      },
      FunctionDeclaration: checkComponent,
      FunctionExpression: checkComponent,
      ArrowFunctionExpression: checkComponent,
      'FunctionDeclaration:exit': leaveComponent,
      'FunctionExpression:exit': leaveComponent,
      'ArrowFunctionExpression:exit': leaveComponent,
      CallExpression(node) {
        const current = components.at(-1)
        if (!current || node.callee.type !== 'Identifier') return
        if (node.callee.name === 'useService') current.services++
        if (node.callee.name === 'useValue') current.values++
      },
    }
  },
}
