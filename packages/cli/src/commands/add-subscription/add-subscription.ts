import { join }             from 'node:path'
// --------------------------------------------------------
import { codeTokens }       from '../../changes/code-tokens/code-tokens'
import { indexOfTokens }    from '../../changes/index-of-tokens/index-of-tokens'
import { featureNames }     from '../../names/feature-names/feature-names'
import { moduleNames }      from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
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

const USAGE = 'newt add subscription takes the module, its use case and --on the event, as in newt add subscription sales/orders/order mark-paid --on created, or --on customers/customer/created for an event of another feature'

/** Where the event comes from: the module's own, or a module it is given. */
type Emitter = {
  /** The event, as the reaction reads it: `orders.events`, `deps.customers.customer.events`. */
  from: string
  /** The emitting module's name, as its queue tells it: `customers[customer]`. */
  name: string
  /** Its folder, from `cwd`, and its own folder's name, to find the event's file. */
  folder: string
  module: string
  /** Its variable in the module's test, to make it emit `created`. */
  creator: string | null
  /** When it is another feature's: its name, and its module's file, where the event is exposed. */
  feature: string | null
}

/** The module's own event: `--on created`. */
function ownEmitter({ folder, module }: FoundModule): Emitter {
  return { from: module.plural, name: module.name, folder, module: module.folder, creator: module.plural, feature: null }
}

/** An event of a module it is given: `--on customers/customer/created` for another feature's, `--on orders/invoice/paid` for one of its feature. */
async function givenEmitter(found: FoundModule, featureFolder: string, moduleFolder: string, given: string, cwd: string): Promise<Emitter> {
  const { context, feature, features, module } = found
  const emitting = features.find(each => each.name === featureFolder)
  if (!emitting) {
    throw new CommandError(`${context.folder} has no feature ${featureFolder}: --on takes the feature, the module and the event, as in --on customers/customer/created`)
  }
  if (!emitting.modules.includes(moduleFolder)) {
    throw new CommandError(`The feature ${context.folder}/${featureFolder} has no module ${moduleFolder}`)
  }
  const ownFeature = featureFolder === feature.folder
  if (ownFeature && moduleFolder === module.folder) {
    throw new CommandError(`${module.folder}'s own events go by their name alone: --on <event>`)
  }
  const emitter = moduleNames(featureNames(featureFolder), moduleFolder)
  const key = ownFeature ? emitter.module : featureNames(featureFolder).camel
  const deps = await Bun.file(join(cwd, found.folder, `${module.folder}.deps.ts`)).text().catch(() => '')
  if (!new RegExp(`^\\s*${key}\\s*:`, 'm').test(deps)) {
    throw new CommandError(`${module.folder} does not use ${ownFeature ? moduleFolder : featureFolder}: let it with newt add deps ${given} ${ownFeature ? moduleFolder : featureFolder}`)
  }
  return {
    from: ownFeature ? `deps.${key}` : `deps.${key}.${emitter.module}`,
    name: emitter.name,
    folder: join(found.featureFolder, '..', featureFolder, moduleFolder),
    module: moduleFolder,
    creator: null,
    feature: ownFeature ? null : featureFolder,
  }
}

/** Whether the emitting module of another feature lists the event in its exposes. */
async function exposed(emitter: Emitter, event: PieceNames, cwd: string): Promise<boolean> {
  const code = await Bun.file(join(cwd, emitter.folder, `${emitter.module}.module.ts`)).text().catch(() => '')
  const events = /events\s*:\s*\[([^\]]*)\]/.exec(/exposes\s*=\s*\{[^}]*\}/.exec(code)?.[0] ?? '')?.[1] ?? ''
  return new RegExp(`['"]${event.camel}['"]`).test(events)
}

export const ADD_SUBSCRIPTION = defineCommand({
  name: 'add subscription',
  summary: 'Runs a use case of a module on an event, its own or of a module it uses, in its workers',
  args: '<context>/<feature>/<module> <use-case>',
  options: {
    on: { type: 'string', value: 'event', description: 'The event it runs on: of the module, created, or of a module it uses, customers/customer/created' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || options.on === undefined || rest.length > 0) throw new CommandError(USAGE)
    const found = await findModule(given, cwd, options.backend, USAGE)
    const { folder, module } = found
    const useCase = useCaseNames(name)
    const on = options.on.split('/')
    if (on.length !== 1 && on.length !== 3) throw new CommandError(USAGE)
    const event = pieceNames(on.at(-1)!, 'an event')
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const useCaseFound = useCaseOf(code, `${module.type}_Module`, useCase.camel)
    if (!useCaseFound) {
      throw new CommandError(`${module.type}_Module has no use case ${useCase.camel}: add it with newt add use-case ${given} ${name}`)
    }
    const emitter = on.length === 1 ? ownEmitter(found) : await givenEmitter(found, on[0]!, on[1]!, given!, cwd)
    const own = emitter.creator !== null
    if (!await Bun.file(join(cwd, emitter.folder, 'events', `${emitter.module}-${event.folder}.ts`)).exists()) {
      throw new CommandError(own
        ? `${module.folder} has no event ${event.folder}: if ${module.folder} emits it, add it with newt add event ${given} ${event.folder}`
        : `${emitter.module} has no event ${event.folder}`)
    }
    const takesInput = useCaseFound.inputs > 0
    const reaction = reactionLine(module, useCase, event, takesInput, emitter.from)
    const workers = await workersChanges(cwd, folder, module, !own)
    const tested = event.folder === 'created' && (own || !takesInput)
    const creator = emitter.creator ?? `modulesOf(features.${emitter.feature === null ? found.feature.camel : featureNames(emitter.feature).camel}).${moduleNames(found.feature, emitter.module).module}`
    const changes: FileChange[] = [
      ...workers.changes,
      { action: 'insert-lines', path: file('.workers.ts'), anchor: workers.head, position: 'after', lines: [reaction], imports: [] },
      ...own
        ? [{ action: 'add-object-property' as const, path: file('.module.ts'), call: 'eventsOf', argument: 1, key: event.camel, value: `${module.type}_${event.type}`, imports: [`import { ${module.type}_${event.type} } from './events/${module.folder}-${event.folder}'`] }]
        : [],
      ...tested ? [{ action: 'append-block' as const, path: file('.module.test.ts'), block: subscriptionTest(module, useCase, event, emitter.name, creator), imports: [] }] : [],
    ]
    const subscribed = indexOfTokens(codeTokens(await Bun.file(join(cwd, file('.workers.ts'))).text().catch(() => '')), codeTokens(reaction)) !== -1
    const warnings = subscribed ? [] : [
      ...tested ? [] : [`newt cannot tell how to make ${event.folder} happen${own ? '' : ` for ${useCase.camel}`}, so it wrote no test of ${useCase.camel} on it: write one in ${module.folder}.module.test.ts`],
      ...!own && takesInput ? [`${useCase.camel} is given the id of ${emitter.name}'s entity as its id: change what it takes from ${event.camel}, in ${module.folder}.workers.ts`] : [],
    ]
    const notExposed = emitter.feature !== null && !await exposed(emitter, event, cwd)
    const nextSteps = [
      ...notExposed ? [`${emitter.feature} exposes no ${event.camel} yet: list it in exposes.events, in ${emitter.module}.module.ts`] : [],
      `bun test ${folder}`,
    ]
    return { changes, warnings, nextSteps }
  },
})
