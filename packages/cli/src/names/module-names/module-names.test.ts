import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { moduleNames } from './module-names'

test("a module's names from its folder's", () => {
  expect(moduleNames('price-change')).toEqual({
    folder: 'price-change',
    module: 'priceChange',
    type: 'PriceChange',
    table: 'price_change',
    words: 'price change',
    plural: 'priceChanges',
    path: 'price-changes',
  })
})

test('plurals in English', () => {
  expect(['order', 'box', 'category', 'day', 'batch'].map(folder => moduleNames(folder).path)).toEqual(['orders', 'boxes', 'categories', 'days', 'batches'])
})

test('refuses a name that is not lowercase words joined by -', () => {
  expect(() => moduleNames('Order')).toThrow("'Order' cannot name a module")
})
