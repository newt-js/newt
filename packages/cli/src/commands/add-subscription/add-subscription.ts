import { join }             from 'node:path'
// --------------------------------------------------------
import { codeTokens }       from '../../changes/code-tokens/code-tokens'
import { indexOfTokens }    from '../../changes/index-of-tokens/index-of-tokens'
import { contextNames }     from '../../names/context-names/context-names'
import { moduleNames }      from '../../names/module-names/module-names'
import { pieceNames }       from '../../names/piece-names/piece-names'
import { useCaseNames }     from '../../names/use-case-names/use-case-names'
import type { FoundModule } from '../../project/find-module/find-module'
import { findModule }       from '../../project/find-module/find-module'
import { useCaseOf }        from '../../project/use-case-of/use-case-of'
import { workersChanges }   from '../../project/workers-changes/workers-changes'
import { reactionLine }     from '../../templates/pieces/subscription-ts'
import { subscriptionTest } from '../../templates/pieces/subscription-ts'
import type { FileChange }  from '../command'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'

const USAGE = 'newt add subscription takes the module, its use case and --on the event, as in newt add subscription sales/order mark-paid --on created, --on customer/created for an event of another module of its context, or --on auth/user/created for one of a module another context publishes'

/** Where the event comes from: the module's own, or a module it is given. */
type Emitter = {
  /** What emits the event, as the reaction reads it: `orders`, `deps.customer`, `deps.auth.user`. */
  from: string
  /** The emitting module's name, as its queue tells it: `customer`. */
  name: string
  /** Its folder, from `cwd`, and its own folder's name, to find the event's file. */
  folder: string
  module: string
  /** How the module's test reaches it, to make it emit `created`; `null` when the test cannot. */
  creator: string | null
}

/** The module's own event: `--on created`. */
function ownEmitter({ folder, module }: FoundModule): Emitter {
  return { from: module.plural, name: module.name, folder, module: module.folder, creator: module.plural }
}

/** That the module's <m>.deps.ts gives it `key`. */
async function isGiven(found: FoundModule, key: string, cwd: string): Promise<boolean> {
  const deps = await Bun.file(join(cwd, found.folder, `${found.module.folder}.deps.ts`)).text().catch(() => '')
  return new RegExp(`^\\s*${key}\\s*:`, 'm').test(deps)
}

/** An event of another module of its context: `--on customer/created`. */
async function siblingEmitter(found: FoundModule, moduleFolder: string, given: string, cwd: string): Promise<Emitter> {
  const { context, modules, module } = found
  if (!modules.includes(moduleFolder)) {
    throw new CommandError(`${context.folder} has no module ${moduleFolder}: --on takes a module of its context and the event, as in --on customer/created`)
  }
  if (moduleFolder === module.folder) {
    throw new CommandError(`${module.folder}'s own events go by their name alone: --on <event>`)
  }
  const emitter = moduleNames(moduleFolder)
  if (!await isGiven(found, emitter.module, cwd)) {
    throw new CommandError(`${module.folder} does not use ${moduleFolder}: let it with newt add deps ${given} ${moduleFolder}`)
  }
  return {
    from: `deps.${emitter.module}`,
    name: emitter.name,
    folder: join(found.contextFolder, 'modules', moduleFolder),
    module: moduleFolder,
    creator: `composed['${emitter.module}']`,
  }
}

/** An event of a module another context publishes: `--on auth/user/created`. */
async function publishedEmitter(found: FoundModule, contextFolder: string, moduleFolder: string, given: string, cwd: string): Promise<Emitter> {
  const other = contextNames(contextFolder)
  const emitter = moduleNames(moduleFolder)
  if (!await isGiven(found, other.camel, cwd)) {
    throw new CommandError(`${found.module.folder} does not use ${contextFolder}: let it with newt add deps ${given} ${contextFolder}`)
  }
  const otherFolder = join(found.contextFolder, '..', contextFolder)
  const otherClass = await Bun.file(join(cwd, otherFolder, `${contextFolder}.context.ts`)).text().catch(() => '')
  if (!new RegExp(`public readonly ${emitter.module}\\s*:`).test(otherClass)) {
    throw new CommandError(`${contextFolder} does not publish ${moduleFolder}: publish it with newt publish ${contextFolder}/${moduleFolder}`)
  }
  return {
    from: `deps.${other.camel}.${emitter.module}`,
    name: emitter.name,
    folder: join(otherFolder, 'modules', moduleFolder),
    module: moduleFolder,
    creator: null,
  }
}

export const ADD_SUBSCRIPTION = defineCommand({
  name: 'add subscription',
  summary: 'Runs a use case of a module on an event, its own or of a module it uses, in its workers',
  args: '<context>/<module> <use-case>',
  options: {
    on: { type: 'string', value: 'event', description: 'The event it runs on: of the module, created, of a module of its context it uses, customer/created, or of a module another context publishes, auth/user/created' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || options.on === undefined || rest.length > 0) throw new CommandError(USAGE)
    const found = await findModule(given, cwd, options.backend, USAGE)
    const { folder, module } = found
    const useCase = useCaseNames(name)
    const on = options.on.split('/')
    if (on.length > 3) throw new CommandError(USAGE)
    const event = pieceNames(on.at(-1)!, 'an event')
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const useCaseFound = useCaseOf(code, `${module.type}_Module`, useCase.camel)
    if (!useCaseFound) {
      throw new CommandError(`${module.type}_Module has no use case ${useCase.camel}: add it with newt add use-case ${given} ${name}`)
    }
    const emitter = on.length === 1 ? ownEmitter(found)
      : on.length === 2 ? await siblingEmitter(found, on[0]!, given!, cwd)
        : await publishedEmitter(found, on[0]!, on[1]!, given!, cwd)
    const own = on.length === 1
    if (!await Bun.file(join(cwd, emitter.folder, 'events', `${emitter.module}-${event.folder}.ts`)).exists()) {
      throw new CommandError(own
        ? `${module.folder} has no event ${event.folder}: if ${module.folder} emits it, add it with newt add event ${given} ${event.folder}`
        : `${emitter.module} has no event ${event.folder}`)
    }
    const takesInput = useCaseFound.inputs > 0
    const reaction = reactionLine(module, useCase, event, takesInput, emitter.from, useCaseFound.input === 'string')
    const workers = await workersChanges(cwd, folder, module, !own)
    const creator = emitter.creator
    const tested = event.folder === 'created' && creator !== null && (own || !takesInput)
    const changes: FileChange[] = [
      ...workers.changes,
      { action: 'insert-lines', path: file('.workers.ts'), anchor: workers.head, position: 'after', lines: [reaction], imports: [] },
      ...own
        ? [{ action: 'add-object-property' as const, path: file('.module.ts'), call: 'eventsOf', argument: 1, key: event.camel, value: `${module.type}_${event.type}`, imports: [`import { ${module.type}_${event.type} } from './events/${module.folder}-${event.folder}'`] }]
        : [],
      ...tested ? [{ action: 'append-block' as const, path: file('.module.test.ts'), block: subscriptionTest(module, useCase, event, emitter.name, creator!), imports: [] }] : [],
    ]
    const subscribed = indexOfTokens(codeTokens(await Bun.file(join(cwd, file('.workers.ts'))).text().catch(() => '')), codeTokens(reaction)) !== -1
    const warnings = subscribed ? [] : [
      ...tested ? [] : [`newt cannot tell how to make ${event.folder} happen${own ? '' : ` for ${useCase.camel}`}, so it wrote no test of ${useCase.camel} on it: write one in ${module.folder}.module.test.ts`],
      ...!own && takesInput ? [`${useCase.camel} is given the id of ${emitter.name}'s entity as its id: change what it takes from ${event.camel}, in ${module.folder}.workers.ts`] : [],
    ]
    const nextSteps = [`bun test ${folder}`]
    return { changes, warnings, nextSteps }
  },
})
