import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { declaredType } from './declared-type'

describe('declaredType', () => {
  test('gives the type a column was declared with, in upper case', () => {
    expect(declaredType({ type: 'json' })).toBe('JSON')
    expect(declaredType({ type: 'Boolean' })).toBe('BOOLEAN')
  })

  // -----

  test('gives an empty text for a column declared with no type', () => {
    expect(declaredType({ type: null })).toBe('')
    expect(declaredType({})).toBe('')
  })
})
