import { join }              from 'node:path'
// --------------------------------------------------------
import type { FileChange }   from '../../../commands/command'
import type { ContextNames } from '../../../names/context-names/context-names'
import type { FeatureNames } from '../../../names/feature-names/feature-names'
import { CONTEXTS_FOLDER }   from '../../../project/backend-contexts/backend-contexts'
import { featureTs }         from '../files/feature-ts'

export type FeatureTemplateOptions = { backend: string, context: ContextNames, names: FeatureNames }

/** The line of <ctx>-features.ts that builds a feature. */
export const featureLine = ({ camel }: FeatureNames, uses = '') => `  const ${camel} = ${camel}Feature(base, router${uses})`

/** A feature of a context: its entry point, and its place in <ctx>-features.ts. */
export function featureTemplate({ backend, context, names }: FeatureTemplateOptions): FileChange[] {
  const contextFolder = join(backend, CONTEXTS_FOLDER, context.folder)
  return [
    { action: 'create', path: join(contextFolder, 'features', names.folder, `${names.folder}.feature.ts`), content: featureTs(names) },
    {
      action: 'wire-module',
      path: join(contextFolder, `${context.folder}-features.ts`),
      functionName: `${context.camel}Features`,
      module: names.camel,
      declaration: featureLine(names),
      imports: [`import { ${names.camel}Feature } from './features/${names.folder}/${names.folder}.feature'`],
    },
  ]
}
