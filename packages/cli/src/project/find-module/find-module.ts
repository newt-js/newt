import { join }              from 'node:path'
import { relative }          from 'node:path'
// --------------------------------------------------------
import { CommandError }      from '../../commands/command-error/command-error'
import type { ContextNames } from '../../names/context-names/context-names'
import { contextNames }      from '../../names/context-names/context-names'
import type { ModuleNames }  from '../../names/module-names/module-names'
import { moduleNames }       from '../../names/module-names/module-names'
import { CONTEXTS_FOLDER }   from '../backend-contexts/backend-contexts'
import { backendContexts }   from '../backend-contexts/backend-contexts'
import { findBackend }       from '../find-backend/find-backend'
import { writtenPlural }     from '../written-plural/written-plural'

/**
 * A module of the backend: the backend, the module's folder and its context's (from
 * `cwd`), its context's names and its own, and the modules of its context.
 */
export type FoundModule = { backend: string, folder: string, contextFolder: string, context: ContextNames, module: ModuleNames, modules: string[] }

/** A module of the backend, from `<context>/<module>`; one that is not there says how to add it. */
export async function findModule(given: string | undefined, cwd: string, backendGiven: string | undefined, usage: string): Promise<FoundModule> {
  const [context, module, ...more] = given?.split('/') ?? []
  if (context === undefined || module === undefined || more.length > 0) {
    throw new CommandError(usage)
  }
  const names = { context: contextNames(context), module: moduleNames(module) }
  const backend = await findBackend(cwd, backendGiven)
  const found = (await backendContexts(backend)).find(each => each.name === context)
  if (!found) {
    throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
  }
  if (!found.modules.includes(module)) {
    throw new CommandError(`The context ${context} has no module ${module}: add it with newt add module ${context}/${module}`)
  }
  const contextFolder = relative(cwd, join(backend, CONTEXTS_FOLDER, context))
  const folder = join(contextFolder, 'modules', module)
  const plural = await writtenPlural(join(cwd, folder), names.module)
  return {
    backend: relative(cwd, backend),
    folder,
    contextFolder,
    context: names.context,
    module: plural === undefined ? names.module : moduleNames(module, plural),
    modules: found.modules,
  }
}
