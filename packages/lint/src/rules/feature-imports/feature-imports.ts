import { TSESLint }     from '@typescript-eslint/utils'
// --------------------------------------------------------
import { absolute }     from '../../paths/paths'
import { featurePlace } from '../../paths/paths'
import { importsOf }    from '../../paths/paths'
import { resolved }     from '../../paths/paths'
import { rootOf }       from '../../paths/paths'

export type FeatureImportsOptions = { folder: string }

/** That a path inside a feature is its entry point, `<feature>.feature.ts`, as an import names it: with or without its extension. */
const isEntryPoint = (inside: string, feature: string) => inside.replace(/\.[cm]?[jt]sx?$/, '') === `${feature}.feature`

/**
 * A feature is reached from outside it only through its entry point,
 * `features/<feature>/<feature>.feature.ts`: what it returns is the feature's contract,
 * and what it re-exports (types, errors) is all another feature may name of it. Its
 * modules are its own, so they can be merged or split without breaking another feature.
 * The files of the context outside its features (its composition) import the entry
 * points alone too.
 */
export const featureImports: TSESLint.RuleModule<'inside', [FeatureImportsOptions]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: 'Another feature is reached only through its entry point, <feature>.feature.ts.' },
    messages: {
      inside: "'{{path}}' is inside the feature {{feature}}: from outside it, import only its entry point, features/{{feature}}/{{feature}}.feature.ts, and reach its modules through the contract it returns ({{feature}}.<module>.<use case>). A type or an error another feature needs, its entry point re-exports.",
    },
    schema: [{
      type: 'object',
      properties: { folder: { type: 'string' } },
      required: ['folder'],
      additionalProperties: false,
    }],
  },
  create(context) {
    const folder = absolute(context.options[0].folder, rootOf(context))
    const own = featurePlace(context.physicalFilename, folder)
    return importsOf((node, specifier) => {
      const path = resolved(context, specifier)
      const imported = path && featurePlace(path, folder)
      if (!imported || (own && own.context === imported.context && own.feature === imported.feature)) return
      if (isEntryPoint(imported.inside, imported.feature)) return
      context.report({ node, messageId: 'inside', data: { path: specifier, feature: imported.feature } })
    })
  },
}
