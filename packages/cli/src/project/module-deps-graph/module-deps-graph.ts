import { join }        from 'node:path'
// --------------------------------------------------------
import { moduleNames } from '../../names/module-names/module-names'

const DEP = /:\s*(\w+)_Module\b/g

/** What each module of a context uses, by the X_Module types its <m>.deps.ts names, whatever keys it gives them. */
export async function moduleDepsGraph(contextFolder: string, modules: string[]): Promise<Map<string, string[]>> {
  const byType = new Map(modules.map(folder => [moduleNames(folder).type, moduleNames(folder).module]))
  const graph = new Map<string, string[]>()
  for (const folder of modules) {
    const file = Bun.file(join(contextFolder, 'modules', folder, `${folder}.deps.ts`))
    const text = await file.exists() ? await file.text() : ''
    graph.set(moduleNames(folder).module, [...text.matchAll(DEP)].flatMap(match => byType.get(match[1]!) ?? []))
  }
  return graph
}
