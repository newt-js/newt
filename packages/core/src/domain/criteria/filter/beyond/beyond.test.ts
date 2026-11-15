import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { beyond }   from './beyond'

const leaf = { field: 'a', op: 'eq', value: 1 }

describe('beyond', () => {
  test('nothing for a filter within its limits', () => {
    expect(beyond(leaf, 3, 20)).toBeNull()
    expect(beyond({ and: [leaf, { or: [leaf, leaf] }] }, 3, 20)).toBeNull()
  })

  test('depth when groups nest deeper than allowed', () => {
    expect(beyond({ and: [{ or: [leaf] }] }, 2, 20)).toBeNull()
    expect(beyond({ and: [{ or: [{ and: [leaf] }] }] }, 2, 20)).toBe('depth')
  })

  test('conditions when there are more than allowed', () => {
    expect(beyond({ and: [leaf, leaf] }, 3, 2)).toBeNull()
    expect(beyond({ and: [leaf, leaf, leaf] }, 3, 2)).toBe('conditions')
  })

  test('conditions before walking a group far too wide', () => {
    expect(beyond({ and: Array.from({ length: 1000 }, () => leaf) }, 3, 20)).toBe('conditions')
  })

  test('an empty group counts as a condition', () => {
    expect(beyond({ and: [] }, 0, 1)).toBeNull()
    expect(beyond({ and: [{ or: [] }, { or: [] }] }, 3, 1)).toBe('conditions')
  })
})
