import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'

export function workersHead({ type, plural }: ModuleNames): string {
  return `export function register${type}Workers(${plural}: ${type}_Module): void {`
}

export function workersTs(module: ModuleNames): string {
  return `import type { ${module.type}_Module } from './${module.folder}.module'

${workersHead(module)}
}
`
}

/** The use case runs on the event, given the id of the entity the event carries when it takes an input. */
export function reactionLine({ plural }: ModuleNames, useCase: PieceNames, event: PieceNames, takesInput: boolean): string {
  const args = takesInput ? `, ${event.camel} => [{ id: ${event.camel}.id }]` : ''
  return `  ${plural}.on(${plural}.events.${event.camel}, '${useCase.camel}'${args})`
}

export function subscriptionTest({ module, plural }: ModuleNames, useCase: PieceNames, event: PieceNames): string {
  const queue = `${module}.${useCase.camel}.on.${module}.${event.camel}`
  return `test('${useCase.camel} runs on ${module}.${event.camel}', async () => {
  await ${plural}.create({ name: 'First' })
  await context.settle()

  const jobs = await context.base.database.outbox.list()
  expect(jobs.find(job => job.queue === '${queue}')?.status).toBe('done')
})`
}
