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
 * A module lives in a feature, `<context>/features/<feature>/<module>/`: a file in a
 * context's `modules/`, in a feature's `modules/`, in a `feature/` folder, or in a folder
 * of a feature with no `<folder>.module.ts`, would
 * be checked by no rule of a module's, and newt would not take it as one.
 */
export const modulePlace: TSESLint.RuleModule<'outside' | 'singular' | 'inFeature' | 'notModule', [ModulePlaceOptions]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: 'A module lives in a feature: <context>/features/<feature>/<module>/.' },
    messages: {
      outside: 'A module lives in its feature: move {{context}}/modules/{{module}} to {{context}}/features/<feature>/{{module}}, as newt add module {{context}}/<feature>/{{module}} writes it.',
      singular: "'{{found}}/' is '{{plural}}/': a module lives in {{context}}/features/<feature>/<module>/.",
      inFeature: "A feature's modules are its folders: move {{context}}/features/{{feature}}/{{found}}/{{module}} to {{context}}/features/{{feature}}/{{module}}.",
      notModule: "{{context}}/features/{{feature}}/{{folder}}/ is no module, as it has no {{folder}}.module.ts: a feature holds its class, {{feature}}.feature.ts, its entry point, index.ts, and a folder for each of its modules. Put this file in a module's folder.",
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
        const report = (messageId: 'outside' | 'singular' | 'inFeature' | 'notModule', data: Record<string, string>) => context.report({ node, loc: { line: 1, column: 0 }, messageId, data: { context: own, ...data } })
        if (first === 'modules' && feature !== undefined && second !== undefined) report('outside', { module: feature })
        else if (first === 'feature' && second !== undefined) report('singular', { found: 'feature', plural: 'features' })
        else if (first === 'features' && (second === 'modules' || second === 'module') && module !== undefined) report('inFeature', { feature: feature!, found: second, module })
        else if (first === 'features' && second !== undefined && module !== undefined && !existsSync(posix.join(folder, own, 'features', feature!, second, `${second}.module.ts`))) {
          report('notModule', { feature: feature!, folder: second })
        }
      },
    }
  },
}
