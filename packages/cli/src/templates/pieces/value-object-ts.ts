import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { fittedCall }       from '../fitted-call/fitted-call'
import { fitting }          from '../fitted-call/fitted-call'

/** A value object of a module: a branded text its schema checks, and the error it throws for anything else. */
export function valueObjectTs(value: PieceNames): string {
  return `import { defineValueObject } from '@newt-js/core'
import { z } from 'zod'
import { Invalid${value.type} } from '../errors/invalid-${value.folder}'

export const ${value.type} = defineValueObject(
${fitting(`  z.string().trim().min(1).max(100).brand<'${value.type}'>(),`, `  z.string().trim().min(1).max(100)\n    .brand<'${value.type}'>(),`)}
  text => new Invalid${value.type}(text),
)
${fitting(`export type ${value.type} = z.output<typeof ${value.type}.schema>`, `export type ${value.type} =\n  z.output<typeof ${value.type}.schema>`)}
`
}

/** The id of another module's entity, which a module keeps: of the same brand, so that module's use cases take it as it is. */
export function foreignIdTs(value: PieceNames): string {
  return `import { uuidFactory, type Uuid } from '@newt-js/core'

${fittedCall('', `export const ${value.type} = uuidFactory`, [`'${value.type}'`])}
${fitting(`export type ${value.type} = Uuid<'${value.type}'>`, `export type ${value.type} =\n  Uuid<'${value.type}'>`)}
`
}

export function invalidValueTs(module: ModuleNames, value: PieceNames): string {
  const code = `'${module.name}.invalid_${value.folder.replaceAll('-', '_')}'`
  const message = `\`'\${value}' is not a valid ${value.words}\``
  return `import { ValidationError } from '@newt-js/core'

${fitting(`export class Invalid${value.type} extends ValidationError<{ value: string }> {`, `export class Invalid${value.type}\n  extends ValidationError<{ value: string }> {`)}
${fitting(`  readonly code = ${code}`, `  readonly code =\n    ${code}`)}

  constructor(value: string) {
${fittedCall('    ', 'super', [message, '{ value }'])}
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
${fitting(`  expect(() => ${value.type}.from('  ')).toThrow(Invalid${value.type})`, `  const invalid = () => ${value.type}.from('  ')\n  expect(invalid).toThrow(Invalid${value.type})`)}
})
`
}
