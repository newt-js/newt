import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { holds }    from './holds'

describe('holds', () => {
  test('a field passes its condition', () => {
    expect(holds({ a: 1 }, { kind: 'field', field: 'a', condition: { eq: 1 } })).toBe(true)
    expect(holds({ a: 2 }, { kind: 'field', field: 'a', condition: { eq: 1 } })).toBe(false)
  })

  test('a missing field is null', () => {
    expect(holds({}, { kind: 'field', field: 'a', condition: { eq: null } })).toBe(true)
  })

  test('all needs every branch, any one of them', () => {
    const one = { kind: 'field', field: 'a', condition: { eq: 1 } } as const
    const two = { kind: 'field', field: 'b', condition: { eq: 2 } } as const
    expect(holds({ a: 1, b: 3 }, { kind: 'all', of: [one, two] })).toBe(false)
    expect(holds({ a: 1, b: 3 }, { kind: 'any', of: [one, two] })).toBe(true)
    expect(holds({ a: 0 }, { kind: 'any', of: [{ kind: 'all', of: [] }] })).toBe(true)
  })
})
