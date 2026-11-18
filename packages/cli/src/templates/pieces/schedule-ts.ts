import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { quoted }           from '../quoted/quoted'

export function scheduledUseCase(useCase: PieceNames): string {
  return `  @UseCase()
  async ${useCase.camel}(): Promise<void> {
  }`
}

/** The schedule is declared with its cron, and once a year has gone by it has fired and its use case has run. */
export function scheduleTest({ name }: ModuleNames, useCase: PieceNames, cron: string, context: string): string {
  return `test('${useCase.camel} runs at ${cron}', async () => {
  const described = describeApplication([context.base]).contexts.find(each => each.name === '${context}')
  const events = described?.modules.find(each => each.name === '${name}')?.events ?? []
  expect(events).toContainEqual(expect.objectContaining({ name: '${name}.${useCase.camel}', schedule: { cron: ${quoted(cron)} } }))

  await context.base.schedules.tick()
  context.clock.advance(366 * 24 * 60 * 60 * 1000)
  await context.base.schedules.tick()
  await context.settle()

  const queued = await context.base.database.outbox.list()
  expect(queued.find(each => each.queue === '${name}.${useCase.camel}_on_${name}.${useCase.camel}')?.status).toBe('done')
})`
}
