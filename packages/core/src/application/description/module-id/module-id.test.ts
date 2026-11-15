import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { moduleId } from './module-id'

describe('moduleId', () => {
  test('names a module by its context and its name', () => {
    expect(moduleId('shop', 'order')).toBe('shop/order')
  })
})
