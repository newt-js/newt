import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { isNode }   from './is-node'

describe('isNode', () => {
  test('a group or a condition is a node', () => {
    expect(isNode({ and: [] })).toBe(true)
    expect(isNode({ or: [] })).toBe(true)
    expect(isNode({ field: 'price' })).toBe(true)
    expect(isNode({ op: 'eq' })).toBe(true)
  })

  test('an object of equalities is not', () => {
    expect(isNode({ price: 5, name: 'x' })).toBe(false)
    expect(isNode({})).toBe(false)
  })
})
