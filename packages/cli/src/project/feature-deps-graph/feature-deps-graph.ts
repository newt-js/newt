import { join }         from 'node:path'
// --------------------------------------------------------
import { featureNames } from '../../names/feature-names/feature-names'

const USE = /:\s*(\w+)_Feature\b/g

/** What each feature of a context uses, by the other X_Feature classes its <feature>.feature.ts names, whatever keys it gives them. */
export async function featureDepsGraph(contextFolder: string, features: string[]): Promise<Map<string, string[]>> {
  const byType = new Map(features.map(folder => [featureNames(folder).type, featureNames(folder).camel]))
  const graph = new Map<string, string[]>()
  for (const folder of features) {
    const file = Bun.file(join(contextFolder, 'features', folder, `${folder}.feature.ts`))
    const text = await file.exists() ? await file.text() : ''
    const own = featureNames(folder).camel
    graph.set(own, [...text.matchAll(USE)].flatMap(match => byType.get(match[1]!) ?? []).filter(used => used !== own))
  }
  return graph
}
