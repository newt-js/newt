import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { quoted }           from '../quoted/quoted'

export function scheduledUseCase(useCase: PieceNames): string {
  return `  @UseCase()
  async ${useCase.camel}(): Promise<void> {
  }`
}

export function scheduleTest({ module }: ModuleNames, useCase: PieceNames, cron: string, context: string): string {
  return `test('${useCase.camel} runs at ${cron}', () => {
  const sales = describeApplication([context.base]).contexts.find(each => each.name === '${context}')
  const events = sales?.modules.find(each => each.name === '${module}')?.events ?? []
  expect(events).toContainEqual(expect.objectContaining({ name: '${module}.${useCase.camel}', schedule: { cron: ${quoted(cron)} } }))
})`
}
