import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { SqlDialect }      from '../../dialect/sql-dialect'
import { fieldConditions } from './field-conditions'

const dialect = {
  always: 'TRUE',
  never: 'FALSE',
  quote: (name: string) => `"${name}"`,
  param: (n: number) => `$${n}`,
  distinct: (column: string, value: string) => `${column} IS DISTINCT FROM ${value}`,
  ieq: (column: string, next: () => string) => `lower(${column}) = lower(${next()})`,
} as unknown as SqlDialect

const context = {
  column: (field: string) => field.toUpperCase(),
  value: (_field: string, operand: unknown) => operand,
}

describe('fieldConditions', () => {
  test('gives one condition per operator, its operands as numbered params', () => {
    const params: unknown[] = []

    expect(fieldConditions('n', { gte: 1, lt: 5 }, dialect, context, params)).toEqual(['"N" >= $1', '"N" < $2'])
    expect(params).toEqual([1, 5])
  })

  // -----

  test('the column and the value come from the context', () => {
    const params: unknown[] = []
    const encoding = { column: () => 'kept_as', value: (field: string, operand: unknown) => `${field}:${String(operand)}` }

    expect(fieldConditions('name', { eq: 'a' }, dialect, encoding, params)).toEqual(['"kept_as" = $1'])
    expect(params).toEqual(['name:a'])
  })

  // -----

  test('equal to null is IS NULL, not equal to null IS NOT NULL, and not equal uses the dialect', () => {
    const params: unknown[] = []

    expect(fieldConditions('n', { eq: null }, dialect, context, params)).toEqual(['"N" IS NULL'])
    expect(fieldConditions('n', { ne: null }, dialect, context, params)).toEqual(['"N" IS NOT NULL'])
    expect(fieldConditions('n', { ne: 2 }, dialect, context, params)).toEqual(['"N" IS DISTINCT FROM $1'])
  })

  // -----

  test('a text with a NUL, that no column holds, equals nothing and differs from everything', () => {
    const params: unknown[] = []

    expect(fieldConditions('n', { eq: 'a\u0000b' }, dialect, context, params)).toEqual(['FALSE'])
    expect(fieldConditions('n', { ne: 'a\u0000b' }, dialect, context, params)).toEqual(['TRUE'])
    expect(fieldConditions('n', { ieq: 'a\u0000b' }, dialect, context, params)).toEqual(['FALSE'])
    expect(params).toEqual([])
  })

  // -----

  test('a range bound with a NUL compares with the text before it', () => {
    const params: unknown[] = []

    expect(fieldConditions('n', { gt: 'ab\u0000', gte: 'cd\u0000', lt: 'ef\u0000', lte: 'gh\u0000' }, dialect, context, params)).toEqual(['"N" > $1', '"N" > $2', '"N" <= $3', '"N" <= $4'])
    expect(params).toEqual(['ab', 'cd', 'ef', 'gh'])
  })

  // -----

  test('in lists the values, with null as IS NULL and the ones with a NUL left out', () => {
    const params: unknown[] = []

    expect(fieldConditions('n', { in: ['a', 'b\u0000', null] }, dialect, context, params)).toEqual(['("N" IN ($1) OR "N" IS NULL)'])
    expect(fieldConditions('n', { in: [] }, dialect, context, params)).toEqual(['FALSE'])
    expect(params).toEqual(['a'])
  })

  // -----

  test('ieq compares through the dialect, and on anything but text matches nothing', () => {
    const params: unknown[] = []

    expect(fieldConditions('n', { ieq: 'Ana' }, dialect, context, params)).toEqual(['lower("N") = lower($1)'])
    expect(fieldConditions('n', { ieq: 3 } as never, dialect, context, params)).toEqual(['FALSE'])
  })

  // -----

  test('an unknown operator is refused, naming it and its field', () => {
    expect(() => fieldConditions('n', { near: 1 } as never, dialect, context, [])).toThrow("Unknown operator 'near' on 'n'")
  })
})
