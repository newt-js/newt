import { TSESLint } from '@typescript-eslint/utils'
// --------------------------------------------------------
import { absolute } from '../../paths/paths'
import { real }     from '../../paths/paths'
import { rootOf }   from '../../paths/paths'
import { slashed }  from '../../paths/paths'

export type ModulePlaceOptions = { folder: string }

/**
 * A module lives in a feature, `<context>/features/<feature>/modules/<module>/`: a file
 * in a context's `modules/`, or in a folder named almost so (`feature/`, `module/`), would
 * be checked by no rule of a module's, and newt would not take it as one.
 */
export const modulePlace: TSESLint.RuleModule<'outside' | 'singular', [ModulePlaceOptions]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: 'A module lives in a feature: <context>/features/<feature>/modules/<module>/.' },
    messages: {
      outside: 'A module lives in its feature: move {{context}}/modules/{{module}} to {{context}}/features/<feature>/modules/{{module}}, as newt add module {{context}}/<feature>/{{module}} writes it.',
      singular: "'{{found}}/' is '{{plural}}/': a module lives in {{context}}/features/<feature>/modules/<module>/.",
    },
    schema: [{
      type: 'object',
      properties: { folder: { type: 'string' } },
      required: ['folder'],
      additionalProperties: false,
    }],
  },
  create(context) {
    const folder = real(absolute(context.options[0].folder, rootOf(context)))
    const path = real(slashed(context.physicalFilename))
    if (!path.startsWith(`${folder}/`)) return {}
    const [own, first, feature, second, module] = path.slice(folder.length + 1).split('/')
    if (own === undefined || first === undefined) return {}
    return {
      Program(node) {
        const report = (messageId: 'outside' | 'singular', data: Record<string, string>) => context.report({ node, loc: { line: 1, column: 0 }, messageId, data: { context: own, ...data } })
        if (first === 'modules' && feature !== undefined && second !== undefined) report('outside', { module: feature })
        else if (first === 'feature' && second !== undefined) report('singular', { found: 'feature', plural: 'features' })
        else if (first === 'features' && second === 'module' && module !== undefined) report('singular', { found: 'module', plural: 'modules' })
      },
    }
  },
}
