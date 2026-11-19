import { join }              from 'node:path'
// --------------------------------------------------------
import type { FileChange }   from '../../../commands/command'
import type { ContextNames } from '../../../names/context-names/context-names'
import type { FeatureNames } from '../../../names/feature-names/feature-names'
import { CONTEXTS_FOLDER }   from '../../../project/backend-contexts/backend-contexts'
import { featureClass }      from '../files/feature-ts'
import { featureIndexTs }    from '../files/feature-ts'
import { featureTs }         from '../files/feature-ts'

export type FeatureTemplateOptions = { backend: string, context: ContextNames, names: FeatureNames }

/** The line of <ctx>.context.ts that initializes a feature. */
const featureLine = (names: FeatureNames) => `    const ${names.camel} = ${featureClass(names)}.initialize(base, router)`

/** A feature of a context: its class, its index.ts, and its place in <ctx>.context.ts. */
export function featureTemplate({ backend, context, names }: FeatureTemplateOptions): FileChange[] {
  const contextFolder = join(backend, CONTEXTS_FOLDER, context.folder)
  const folder = join(contextFolder, 'features', names.folder)
  return [
    { action: 'create', path: join(folder, `${names.folder}.feature.ts`), content: featureTs(names) },
    { action: 'create', path: join(folder, 'index.ts'), content: featureIndexTs(names) },
    {
      action: 'wire-module',
      path: join(contextFolder, `${context.folder}.context.ts`),
      className: `${context.type}_Context`,
      name: names.camel,
      type: featureClass(names),
      declaration: featureLine(names),
      imports: [`import { ${featureClass(names)} } from './features/${names.folder}'`],
    },
  ]
}
