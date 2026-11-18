import { join }              from 'node:path'
// --------------------------------------------------------
import type { FeatureNames } from '../../names/feature-names/feature-names'
import { moduleNames }       from '../../names/module-names/module-names'

const DEP = /:\s*(\w+)_Module\b/g

/** What each module of a feature uses, by the X_Module types its <m>.deps.ts names, whatever keys it gives them. */
export async function moduleDepsGraph(featureFolder: string, feature: FeatureNames, modules: string[]): Promise<Map<string, string[]>> {
  const names = (folder: string) => moduleNames(feature, folder)
  const byType = new Map(modules.map(folder => [names(folder).type, names(folder).module]))
  const graph = new Map<string, string[]>()
  for (const folder of modules) {
    const file = Bun.file(join(featureFolder, folder, `${folder}.deps.ts`))
    const text = await file.exists() ? await file.text() : ''
    graph.set(names(folder).module, [...text.matchAll(DEP)].flatMap(match => byType.get(match[1]!) ?? []))
  }
  return graph
}
