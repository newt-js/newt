import { readdir } from 'node:fs/promises'
import { join }    from 'node:path'

/** A feature of a context, read from its folder: its name and its modules'. */
export type FeatureFolder = { name: string, modules: string[] }

export type ContextFolder = { name: string, features: FeatureFolder[] }

export const CONTEXTS_FOLDER = 'src/contexts'

async function foldersIn(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true }).catch(() => [])
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
}

/** A backend's contexts, read from its folders: each one of src/contexts with its <name>.context.ts, and its features, each with its modules, the folders with their <module>.module.ts. */
export async function backendContexts(backend: string): Promise<ContextFolder[]> {
  const contexts: ContextFolder[] = []
  for (const name of await foldersIn(join(backend, CONTEXTS_FOLDER))) {
    const folder = join(backend, CONTEXTS_FOLDER, name)
    if (await Bun.file(join(folder, `${name}.context.ts`)).exists()) {
      const features: FeatureFolder[] = []
      for (const feature of await foldersIn(join(folder, 'features'))) {
        const featureFolder = join(folder, 'features', feature)
        // A module is a folder with its <module>.module.ts: any other folder of the feature is none.
        const modules = []
        for (const each of await foldersIn(featureFolder)) {
          if (await Bun.file(join(featureFolder, each, `${each}.module.ts`)).exists()) modules.push(each)
        }
        features.push({ name: feature, modules })
      }
      contexts.push({ name, features })
    }
  }
  return contexts
}
