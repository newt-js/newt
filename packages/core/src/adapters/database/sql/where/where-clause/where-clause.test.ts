import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { criteriaTree } from '../../../../../domain/criteria/criteria-tree/criteria-tree'
import { Criteria }     from '../../../../../domain/criteria/criteria/criteria'
import { SqlDialect }   from '../../dialect/sql-dialect'
import { whereClause }  from './where-clause'

const dialect = {
  param: (n: number) => `$${n}`,
  quote: (name: string) => `"${name}"`,
  always: 'TRUE',
  never: 'FALSE',
  distinct: (column: string, param: string) => `${column} IS DISTINCT FROM ${param}`,
  ieq: (column: string, next: () => string) => `lower(${column}) = lower(${next()})`,
} as SqlDialect

type Row = { name: string | null, size: number, workspaceId: string }

const where = (criteria: Criteria<Row>) => {
  const params: unknown[] = []
  const context = { column: (field: string) => field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), value: (_: string, operand: unknown) => operand }
  const sql = whereClause(criteriaTree(criteria), dialect, context, params)
  return { sql, params }
}

describe('whereClause', () => {
  test('says each condition of a field, its values as parameters, its column in snake case', () => {
    expect(where({ size: { gte: 2, lt: 5 }, workspaceId: 'w1' })).toEqual({ sql: '(("size" >= $1 AND "size" < $2) AND "workspace_id" = $3)', params: [2, 5, 'w1'] })
  })

  test('asks null with IS, and a difference that counts null as a value', () => {
    expect(where({ name: null })).toEqual({ sql: '"name" IS NULL', params: [] })
    expect(where({ name: { ne: null } })).toEqual({ sql: '"name" IS NOT NULL', params: [] })
    expect(where({ name: { ne: 'a' } })).toEqual({ sql: '"name" IS DISTINCT FROM $1', params: ['a'] })
  })

  test('a list with null asks for null beside it, and an empty one for nothing', () => {
    expect(where({ name: { in: ['a', null] } })).toEqual({ sql: '("name" IN ($1) OR "name" IS NULL)', params: ['a'] })
    expect(where({ name: { in: [] } })).toEqual({ sql: 'FALSE', params: [] })
  })

  test('joins with and and or, and asks nothing of no criteria', () => {
    expect(where({})).toEqual({ sql: 'TRUE', params: [] })
    expect(where({ or: [{ size: 1 }, { size: 2 }] })).toEqual({ sql: '("size" = $1 OR "size" = $2)', params: [1, 2] })
    expect(where({ or: [] })).toEqual({ sql: 'FALSE', params: [] })
  })

  test('compares ignoring case as its dialect says, text only', () => {
    expect(where({ name: { ieq: 'Ana' } })).toEqual({ sql: 'lower("name") = lower($1)', params: ['Ana'] })
  })

  test('a value with NUL, which no database keeps, equals nothing and orders as the text before it', () => {
    expect(where({ name: 'a\u0000b' })).toEqual({ sql: 'FALSE', params: [] })
    expect(where({ name: { ne: 'a\u0000b' } })).toEqual({ sql: 'TRUE', params: [] })
    expect(where({ name: { gte: 'a\u0000b' } })).toEqual({ sql: '"name" > $1', params: ['a'] })
  })
})
