import { join }             from 'node:path'
// --------------------------------------------------------
import { codeTokens }       from '../../changes/code-tokens/code-tokens'
import { indexOfTokens }    from '../../changes/index-of-tokens/index-of-tokens'
import { pieceNames }       from '../../names/piece-names/piece-names'
import { useCaseNames }     from '../../names/use-case-names/use-case-names'
import { findModule }       from '../../project/find-module/find-module'
import { useCaseOf }        from '../../project/use-case-of/use-case-of'
import { reactionLine }     from '../../templates/pieces/subscription-ts'
import { subscriptionTest } from '../../templates/pieces/subscription-ts'
import { workersHead }      from '../../templates/pieces/subscription-ts'
import { workersTs }        from '../../templates/pieces/subscription-ts'
import type { FileChange }  from '../command'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'

const USAGE = 'newt add subscription takes the module, its use case and --on the event, as in newt add subscription sales/orders/order mark-paid --on created'

export const ADD_SUBSCRIPTION = defineCommand({
  name: 'add subscription',
  summary: 'Runs a use case of a module on one of its events, in its workers',
  args: '<context>/<feature>/<module> <use-case>',
  options: {
    on: { type: 'string', value: 'event', description: 'The event of the module it runs on' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || options.on === undefined || rest.length > 0) throw new CommandError(USAGE)
    const { folder, module } = await findModule(given, cwd, options.backend, USAGE)
    const useCase = useCaseNames(name)
    const event = pieceNames(options.on, 'an event')
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const found = useCaseOf(code, `${module.type}_Module`, useCase.camel)
    if (!found) {
      throw new CommandError(`${module.type}_Module has no use case ${useCase.camel}: add it with newt add use-case ${given} ${name}`)
    }
    if (!await Bun.file(join(cwd, folder, 'events', `${module.folder}-${event.folder}.ts`)).exists()) {
      throw new CommandError(`${module.folder} has no event ${event.folder}: newt add subscription listens to ${module.folder}'s own events; if ${module.folder} emits it, add it with newt add event ${given} ${event.folder}`)
    }
    const reaction = reactionLine(module, useCase, event, found.inputs > 0)
    const changes: FileChange[] = [
      { action: 'create', path: file('.workers.ts'), content: workersTs(module) },
      { action: 'insert-lines', path: file('.workers.ts'), anchor: workersHead(module), position: 'after', lines: [reaction], imports: [] },
      {
        action: 'add-object-property',
        path: file('.module.ts'),
        call: 'eventsOf',
        argument: 1,
        key: event.camel,
        value: `${module.type}_${event.type}`,
        imports: [`import { ${module.type}_${event.type} } from './events/${module.folder}-${event.folder}'`],
      },
      { action: 'insert-lines', path: file('.module.ts'), anchor: '    return module', position: 'before', lines: [`    register${module.type}Workers(module)`], imports: [`import { register${module.type}Workers } from './${module.folder}.workers'`] },
      ...event.folder === 'created' ? [{ action: 'append-block' as const, path: file('.module.test.ts'), block: subscriptionTest(module, useCase, event), imports: [] }] : [],
    ]
    const workers = codeTokens(await Bun.file(join(cwd, file('.workers.ts'))).text().catch(() => ''))
    const subscribed = indexOfTokens(workers, codeTokens(reaction)) !== -1
    const warnings = event.folder === 'created' || subscribed ? [] : [
      `newt cannot tell how to make ${event.folder} happen, so it wrote no test of ${useCase.camel} on it: write one in ${module.folder}.module.test.ts`,
    ]
    return { changes, warnings, nextSteps: [`bun test ${folder}`] }
  },
})
