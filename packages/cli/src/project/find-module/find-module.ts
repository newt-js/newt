import { join }               from 'node:path'
import { relative }           from 'node:path'
// --------------------------------------------------------
import { CommandError }       from '../../commands/command-error/command-error'
import type { ContextNames }  from '../../names/context-names/context-names'
import { contextNames }       from '../../names/context-names/context-names'
import type { FeatureNames }  from '../../names/feature-names/feature-names'
import { featureNames }       from '../../names/feature-names/feature-names'
import type { ModuleNames }   from '../../names/module-names/module-names'
import { moduleNames }        from '../../names/module-names/module-names'
import { CONTEXTS_FOLDER }    from '../backend-contexts/backend-contexts'
import type { FeatureFolder } from '../backend-contexts/backend-contexts'
import { backendContexts }    from '../backend-contexts/backend-contexts'
import { findBackend }        from '../find-backend/find-backend'
import { writtenPlural }      from '../written-plural/written-plural'

/** A feature of the backend: the backend and the feature's folder (from `cwd`), its context's and its own names, its context's features and its modules. */
export type FoundFeature = { backend: string, folder: string, context: ContextNames, feature: FeatureNames, features: FeatureFolder[], modules: string[] }

/** A module of the backend: its folder and its feature's (from `cwd`), and its names. */
export type FoundModule = Omit<FoundFeature, 'folder'> & { folder: string, featureFolder: string, module: ModuleNames }

/** A feature of the backend, from `<context>/<feature>`; one that is not there says how to add it. */
export async function findFeature(given: string | undefined, cwd: string, backendGiven: string | undefined, usage: string): Promise<FoundFeature> {
  const [context, feature, ...more] = given?.split('/') ?? []
  if (context === undefined || feature === undefined || more.length > 0) {
    throw new CommandError(usage)
  }
  const names = { context: contextNames(context), feature: featureNames(feature) }
  const backend = await findBackend(cwd, backendGiven)
  const found = (await backendContexts(backend)).find(each => each.name === context)
  if (!found) {
    throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
  }
  const featureFolder = found.features.find(each => each.name === feature)
  if (!featureFolder) {
    throw new CommandError(`The context ${context} has no feature ${feature}: add it with newt add feature ${context}/${feature}`)
  }
  const folder = join(backend, CONTEXTS_FOLDER, context, 'features', feature)
  return { backend: relative(cwd, backend), folder: relative(cwd, folder), ...names, features: found.features, modules: featureFolder.modules }
}

/** A module of the backend, from `<context>/<feature>/<module>`: its folder (from `cwd`) and its names; one that is not there says how to add it. */
export async function findModule(given: string | undefined, cwd: string, backendGiven: string | undefined, usage: string): Promise<FoundModule> {
  const [context, feature, module, ...more] = given?.split('/') ?? []
  if (context === undefined || feature === undefined || module === undefined || more.length > 0) {
    throw new CommandError(usage)
  }
  const found = await findFeature(`${context}/${feature}`, cwd, backendGiven, usage)
  const names = moduleNames(found.feature, module)
  if (!found.modules.includes(module)) {
    throw new CommandError(`The feature ${context}/${feature} has no module ${module}: add it with newt add module ${context}/${feature}/${module}`)
  }
  const folder = join(found.folder, 'modules', module)
  const plural = await writtenPlural(join(cwd, folder), names)
  return { ...found, featureFolder: found.folder, folder, module: plural === undefined ? names : moduleNames(found.feature, module, plural) }
}
