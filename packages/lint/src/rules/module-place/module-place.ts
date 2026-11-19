import { TSESLint }   from '@typescript-eslint/utils'
import { existsSync } from 'node:fs'
import { posix }      from 'node:path'
// --------------------------------------------------------
import { absolute }   from '../../paths/paths'
import { real }       from '../../paths/paths'
import { rootOf }     from '../../paths/paths'
import { slashed }    from '../../paths/paths'

export type ModulePlaceOptions = { folder: string }

/**
 * A module lives in its context's `modules/`, `<context>/modules/<module>/`: a file in a
 * `features/` or `module/` folder, or in a folder of `modules/` with no
 * `<folder>.module.ts`, would be checked by no rule of a module's, and newt would not take
 * it as one.
 */
export const modulePlace: TSESLint.RuleModule<'feature' | 'singular' | 'notModule', [ModulePlaceOptions]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: 'A module lives in its context: <context>/modules/<module>/.' },
    messages: {
      feature: 'A context has no features: move {{context}}/features/{{feature}}/{{module}} to {{context}}/modules/<module>, its name with the prefix it needs, as newt add module {{context}}/<module> writes it.',
      singular: "'module/' is 'modules/': a module lives in {{context}}/modules/<module>/.",
      notModule: '{{context}}/modules/{{folder}}/ is no module, as it has no {{folder}}.module.ts: a context\'s modules/ holds a folder for each of its modules. Put this file in a module\'s folder.',
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
    const [own, first, second, third] = path.slice(folder.length + 1).split('/')
    if (own === undefined || first === undefined || second === undefined) return {}
    return {
      Program(node) {
        const report = (messageId: 'feature' | 'singular' | 'notModule', data: Record<string, string>) => context.report({ node, loc: { line: 1, column: 0 }, messageId, data: { context: own, ...data } })
        const isInModule = third !== undefined
        if (first === 'features' && isInModule) report('feature', { feature: second, module: third })
        else if (first === 'module') report('singular', {})
        else if (first === 'modules' && isInModule && !existsSync(posix.join(folder, own, 'modules', second, `${second}.module.ts`))) {
          report('notModule', { folder: second })
        }
      },
    }
  },
}
