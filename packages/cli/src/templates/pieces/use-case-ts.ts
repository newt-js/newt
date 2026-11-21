import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { fittedCall }       from '../fitted-call/fitted-call'

export function useCaseSchema({ type }: ModuleNames, useCase: PieceNames): string {
  return `export const ${type}${useCase.type}Schema = ${type}Schema.pick({ id: true })
export type ${type}${useCase.type}DTO = z.input<typeof ${type}${useCase.type}Schema>`
}

/** A use case that reads its entity by id, saves it and tells it: where the entity changes, by a method of its own. */
export function useCaseMember({ type, module }: ModuleNames, useCase: PieceNames): string {
  return `  @UseCase()
  async ${useCase.camel}(input: ${type}${useCase.type}DTO): Promise<${type}DTO> {
    const { id } = ${type}${useCase.type}Schema.parse(input)
${fittedCall('    ', `const [${module}] = await this.repository.find`, ['{ id }', '{ limit: 1 }'])}
    if (!${module}) {
      throw new ${type}NotFound()
    }
    await this.repository.persist(${module})
    return ${module}.toDTO()
  }`
}

export function useCaseTest({ plural, words }: ModuleNames, useCase: PieceNames): string {
  return `test('${useCase.camel} reads the ${words} by its id and tells it', async () => {
  const created = await ${plural}.create({ name: 'First' })

  const result = await ${plural}.${useCase.camel}({ id: created.id })

  expect(result).toMatchObject({ id: created.id })
})`
}
