import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { ConcurrencyConflict } from '../concurrency-conflict/concurrency-conflict'
import { DuplicateValue }      from './duplicate-value'

describe('DuplicateValue', () => {
  test('is a concurrency conflict that names the fields when it can', () => {
    const error = new DuplicateValue(['boardId', 'number'])

    expect(error).toBeInstanceOf(ConcurrencyConflict)
    expect([error.code, error.name]).toEqual(['duplicate_value', 'DuplicateValue'])
    expect(error.params).toEqual({ fields: ['boardId', 'number'] })
    expect(error.message).toBe('There is already one with this boardId and number')
  })

  test('says so without fields when the store cannot tell them', () => {
    const error = new DuplicateValue()

    expect([error.params, error.message]).toEqual([{ fields: [] }, 'There is already one like it'])
  })
})
