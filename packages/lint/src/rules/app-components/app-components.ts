import { TSESLint }   from '@typescript-eslint/utils'
// --------------------------------------------------------
import { appPlaceOf } from '../../paths/paths'

/** The line of a doc comment that says why a component is the app's own. */
const WHY = /^\s*\*?\s*Why:\s*\S/m

/**
 * A component of the app's own (in components/, layouts/ too) is the last resort: its doc comment says, on a
 * line `Why: …`, why nothing in @newt-js/react composes it.
 */
export const appComponents: TSESLint.RuleModule<'why', [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A component of a context's app's own says why nothing in @newt-js/react composes it." },
    messages: {
      why: "{{context}}'s own components are the last resort: say in this file's doc comment, on a line `Why: …`, why nothing in @newt-js/react composes it, or compose those instead.",
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder }] = context.options
    const place = appPlaceOf(context, folder)
    if (!place?.inside.startsWith('components/') || !/\.tsx$/.test(place.inside)) return {}
    return {
      Program(node) {
        const docs = context.sourceCode.getAllComments().filter(comment => comment.type === 'Block' && comment.value.startsWith('*'))
        if (!docs.some(comment => WHY.test(comment.value))) context.report({ node, loc: { line: 1, column: 0 }, messageId: 'why', data: { context: place.context } })
      },
    }
  },
}
