import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { row }      from './row'

describe('row', () => {
  test('a row named after its id, size 1 and no tag', () => {
    expect(row('a')).toEqual({ id: 'a', name: 'a', size: 1, tag: null })
  })

  test('what is given wins over the defaults', () => {
    expect(row('a', { name: 'b', size: 3, tag: 'x' })).toEqual({ id: 'a', name: 'b', size: 3, tag: 'x' })
  })
})
