import { TSESLint }  from '@typescript-eslint/utils'
import { TSESTree }  from '@typescript-eslint/utils'
// --------------------------------------------------------
import { ROOT }      from '../../paths/paths'
import { absolute }  from '../../paths/paths'
import { contextOf } from '../../paths/paths'
import { real }      from '../../paths/paths'
import { rootOf }    from '../../paths/paths'
import { slashed }   from '../../paths/paths'

/** The attributes that style an element. */
const STYLING = /^(className|class|style)$/

/** The tools that make class names. */
const CLASS_TOOLS = new Set(['cn', 'class-variance-authority', 'tailwind-merge', 'clsx'])

/** The package of the components apps use, and its theme: anything else under it is what they build on. */
const COMPONENTS = '@newt-js/react'

const THEME = `${COMPONENTS}/theme.css`

/** The primitives the components build on: Radix, and shadcn's pieces inside @newt-js/react. */
function isPrimitive(source: string): boolean {
  const radix = source === 'radix-ui' || source.startsWith('@radix-ui/')
  const insideComponents = source.startsWith(`${COMPONENTS}/`) && source !== THEME
  return radix || insideComponents
}

/** The name of a key in an object, written as a name or as a string. */
function keyOf(property: TSESTree.Property): string | null {
  if (property.key.type === 'Identifier') return property.key.name
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') return property.key.value
  return null
}

/**
 * A context's app composes components and never styles them, so every app looks the same: outside its
 * own `components/`, no `className`, `class` nor `style`, no `<style>`, no tool that makes class names and no primitive.
 */
export const appStyles: TSESLint.RuleModule<'style' | 'tools' | 'primitive', [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A context's app composes components and styles nothing, but in its own components/." },
    messages: {
      style: "{{context}}'s app does not style: compose the components of @newt-js/react, or make one in its components/ when nothing composes it.",
      tools: "'{{path}}' makes class names: only {{context}}'s app components/ style.",
      primitive: "'{{path}}' is a primitive the components of @newt-js/react build on: use those components, or make one in {{context}}'s app components/.",
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder: written }] = context.options
    const folder = real(absolute(written, rootOf(context)))
    const own = contextOf(context.physicalFilename, folder)
    if (!own || own === ROOT) return {}
    const app = `${folder}/${own}/app`
    const file = real(slashed(context.physicalFilename))
    const inApp = file.startsWith(`${app}/`)
    const inComponents = file.startsWith(`${app}/components/`)
    if (!inApp || inComponents) return {}
    const data = { context: own }
    return {
      JSXAttribute(node) {
        const name = node.name.type === 'JSXNamespacedName' ? node.name.namespace.name : node.name.name
        if (STYLING.test(name)) context.report({ node, messageId: 'style', data })
      },
      JSXSpreadAttribute(node) {
        if (node.argument.type !== 'ObjectExpression') return
        for (const property of node.argument.properties) {
          const key = property.type === 'Property' ? keyOf(property) : null
          if (key !== null && STYLING.test(key)) context.report({ node: property, messageId: 'style', data })
        }
      },
      JSXOpeningElement(node) {
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'style') context.report({ node, messageId: 'style', data })
      },
      ImportDeclaration(node) {
        const path = node.source.value
        if (CLASS_TOOLS.has(path)) context.report({ node, messageId: 'tools', data: { ...data, path } })
        if (isPrimitive(path)) context.report({ node, messageId: 'primitive', data: { ...data, path } })
      },
    }
  },
}
