import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { groupOf }  from './group-of'

describe('groupOf', () => {
  test('the branches of an and or an or', () => {
    expect(groupOf({ and: [1, 2] })).toEqual([1, 2])
    expect(groupOf({ or: [3] })).toEqual([3])
  })

  test('none for a condition, a group that is not a list, or what is not an object', () => {
    expect(groupOf({ field: 'a', op: 'eq', value: 1 })).toBeNull()
    expect(groupOf({ and: 'x' })).toBeNull()
    expect(groupOf(null)).toBeNull()
    expect(groupOf('and')).toBeNull()
  })
})
