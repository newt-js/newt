import { join }        from 'node:path'
// --------------------------------------------------------
import { moduleNames } from '../../names/module-names/module-names'

const DEP = /^\s*(\w+)\s*:\s*\w+_Module\b/gm

/** What each module of a context uses, by the names its <m>.deps.ts gives them. */
export async function moduleDepsGraph(contextFolder: string, modules: string[]): Promise<Map<string, string[]>> {
  const graph = new Map<string, string[]>()
  for (const folder of modules) {
    const file = Bun.file(join(contextFolder, 'modules', folder, `${folder}.deps.ts`))
    const text = await file.exists() ? await file.text() : ''
    graph.set(moduleNames(folder).module, [...text.matchAll(DEP)].map(match => match[1]!))
  }
  return graph
}
