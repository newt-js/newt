import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { item }     from './item'

describe('item', () => {
  test('a new item is named and coded after its id, active, with no data or amount', () => {
    expect(item('a')).toEqual({ id: 'a', name: 'a', code: 'a', active: true, data: null, amount: null })
  })

  // -----

  test('what is given replaces the defaults', () => {
    expect(item('a', { name: null, active: false, amount: 3 })).toEqual({ id: 'a', name: null, code: 'a', active: false, data: null, amount: 3 })
  })
})
