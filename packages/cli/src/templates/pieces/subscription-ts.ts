import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { fittedCall }       from '../fitted-call/fitted-call'

/** The head of a module's workers: given what the module uses, when it reacts to its events. */
export function workersHead({ type, plural }: ModuleNames, withDeps = false): string {
  const deps = withDeps ? `  deps: ${type}_Deps,\n` : ''
  return `export function register${type}Workers(\n  ${plural}: ${type}_Module,\n${deps}): void {`
}

/** The line of the module's initialize that registers its workers. */
export const workersCall = ({ type }: ModuleNames, withDeps: boolean) => `    register${type}Workers(module${withDeps ? ', deps' : ''})`

export function workersTs(module: ModuleNames, withDeps = false): string {
  const deps = withDeps ? `import type { ${module.type}_Deps } from './${module.folder}.deps'\n` : ''
  return `${deps}import type { ${module.type}_Module } from './${module.folder}.module'

${workersHead(module, withDeps)}
}
`
}

/** The use case runs on the event, its module's own or one it is given (`deps.customer`, `deps.auth.user`), given the id of the entity the event carries when it takes an input: the id itself when that is its input. */
export function reactionLine({ plural }: ModuleNames, useCase: PieceNames, event: PieceNames, takesInput: boolean, from = plural, takesId = false): string {
  const input = !takesInput ? [] : takesId ? [`${event.camel} => [${event.camel}.id]`] : [`${event.camel} => [{ id: ${event.camel}.id }]`]
  return fittedCall('  ', `${plural}.on`, [`${from}.events.${event.camel}`, `'${useCase.camel}'`, ...input])
}

/** A test that the use case ran on the event, made to happen by creating an entity of `creator`, the module's own by default. */
export function subscriptionTest({ name, plural }: ModuleNames, useCase: PieceNames, event: PieceNames, emitter = name, creator = plural): string {
  const queue = `${name}.${useCase.camel}_on_${emitter}.${event.camel}`
  return `test('${useCase.camel} runs on ${emitter}.${event.camel}', async () => {
  await ${creator}.create({ name: 'First' })
  await context.settle()

  const queue = '${queue}'
  const queued = await context.base.database.outbox.list()
  const ran = queued.find(each => each.queue === queue)
  expect(ran?.status).toBe('done')
})`
}
