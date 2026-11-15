import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { z }                 from 'zod'
// --------------------------------------------------------
import { ValidationError }   from '../errors/validation-error/validation-error'
import { defineValueObject } from './define-value-object'

class InvalidCode extends ValidationError<{ code: string }> {
  readonly code = 'invalid_code'
  constructor(code: string) {
    super(`'${code}' is no code`, { code })
  }
}

const Code = defineValueObject(z.string().trim().toUpperCase().length(3), value => new InvalidCode(value))

describe('defineValueObject', () => {
  test('from gives what the schema makes of the input', () => {
    expect(Code.from(' abc ')).toBe('ABC')
    expect(Code.schema.parse(' abc ')).toBe('ABC')
  })

  test('from throws its error with what was given when the schema refuses it', () => {
    expect(() => Code.from('abcd')).toThrow(expect.objectContaining({ code: 'invalid_code', params: { code: 'abcd' } }))
  })

  test('tryFrom gives the value, or nothing when the schema refuses it, never an error', () => {
    expect(Code.tryFrom(' abc ')).toBe('ABC')
    expect(Code.tryFrom('abcd')).toBeUndefined()
    expect(Code.tryFrom(null)).toBeUndefined()
  })

  test('keeps what else it is given, next to schema and from', () => {
    const Shout = defineValueObject(z.string(), value => new InvalidCode(value), {
      loud: (value: string) => `${value}!`,
    })

    expect(Shout.loud('hey')).toBe('hey!')
    expect(Shout.from('hey')).toBe('hey')
  })
})
