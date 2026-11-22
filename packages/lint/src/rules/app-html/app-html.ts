import { TSESLint }   from '@typescript-eslint/utils'
// --------------------------------------------------------
import { appPlaceOf } from '../../paths/paths'

/** An element of the browser's own, as JSX writes it: lowercase (`div`, `h1`), not a component. */
const INTRINSIC = /^[a-z]/

/**
 * A context's app is made of components: outside its components/, no element of the browser's own. A `div`
 * is a Column or a Row, an `h1` a Heading, a `p` a Text; what they are to the page is their `as`.
 */
export const appHtml: TSESLint.RuleModule<'html', [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A context's app is made of components: no element of the browser's own, but in its components/." },
    messages: {
      html: '<{{element}}> is the browser\'s own: compose @newt-js/react instead (Column or Row for a box, with `as` for what it is to the page; Heading for a title; Text for a line), or make a component in components/ when nothing composes it.',
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder }] = context.options
    const place = appPlaceOf(context, folder)
    if (!place || place.inside.startsWith('components/')) return {}
    return {
      JSXOpeningElement(node) {
        if (node.name.type === 'JSXIdentifier' && INTRINSIC.test(node.name.name)) context.report({ node, messageId: 'html', data: { element: node.name.name } })
        if (node.name.type === 'JSXNamespacedName') context.report({ node, messageId: 'html', data: { element: `${node.name.namespace.name}:${node.name.name.name}` } })
      },
    }
  },
}
