import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'

/** A value object of a module: a branded text its schema checks, and the error it throws for anything else. */
export function valueObjectTs(value: PieceNames): string {
  return `import { defineValueObject } from '@newt-js/core'
import { z } from 'zod'
import { Invalid${value.type} } from '../errors/invalid-${value.folder}'

export const ${value.type} = defineValueObject(z.string().trim().min(1).max(100).brand<'${value.type}'>(), text => new Invalid${value.type}(text))
export type ${value.type} = z.output<typeof ${value.type}.schema>
`
}

/** The id of another feature's entity, which a module keeps: of the same brand, so that feature's use cases take it as it is. */
export function foreignIdTs(value: PieceNames, feature: string): string {
  return `import { uuidFactory, type Uuid } from '@newt-js/core'

/** A ${value.words.replace(/ id$/, '')} of ${feature}, by its id, as this module keeps it: what ${feature}'s use cases take. */
export const ${value.type} = uuidFactory('${value.type}')
export type ${value.type} = Uuid<'${value.type}'>
`
}

export function invalidValueTs(module: ModuleNames, value: PieceNames): string {
  return `import { ValidationError } from '@newt-js/core'

export class Invalid${value.type} extends ValidationError<{ value: string }> {
  readonly code = '${module.name}.invalid_${value.folder.replaceAll('-', '_')}'

  constructor(value: string) {
    super(\`'\${value}' is not a valid ${value.words}\`, { value })
  }
}
`
}

export function valueObjectTestTs(value: PieceNames): string {
  return `import { expect, test } from 'bun:test'
import { Invalid${value.type} } from '../errors/invalid-${value.folder}'
import { ${value.type} } from './${value.folder}'

test('a ${value.words}, as it is kept', () => {
  expect(${value.type}.from(' A-1 ') as string).toBe('A-1')
})

test('refuses what is not a ${value.words}', () => {
  expect(() => ${value.type}.from('  ')).toThrow(Invalid${value.type})
})
`
}
