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

/** A backend's contexts, read from its folders: each one of src/contexts with its <name>.context.ts, and its features, each with its modules. */
export async function backendContexts(backend: string): Promise<ContextFolder[]> {
  const contexts: ContextFolder[] = []
  for (const name of await foldersIn(join(backend, CONTEXTS_FOLDER))) {
    const folder = join(backend, CONTEXTS_FOLDER, name)
    if (await Bun.file(join(folder, `${name}.context.ts`)).exists()) {
      const features: FeatureFolder[] = []
      for (const feature of await foldersIn(join(folder, 'features'))) {
        features.push({ name: feature, modules: await foldersIn(join(folder, 'features', feature)) })
      }
      contexts.push({ name, features })
    }
  }
  return contexts
}
