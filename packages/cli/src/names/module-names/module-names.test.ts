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

test('plurals English makes otherwise, and one given', () => {
  expect(['child', 'person', 'mouse', 'quiz', 'analysis', 'news', 'sales-person'].map(folder => moduleNames(folder).path)).toEqual(['children', 'people', 'mice', 'quizzes', 'analyses', 'news', 'sales-people'])
  expect(moduleNames('cactus', 'cacti')).toMatchObject({ plural: 'cacti', path: 'cacti', table: 'cactus' })
  expect(() => moduleNames('cactus', 'Cacti')).toThrow("'Cacti' cannot be the plural of cactus")
})

test("refuses a module whose routes would be the context's files", () => {
  expect(() => moduleNames('file')).toThrow("'file' cannot name a module: its routes would be under /<context>/files")
})

test('refuses a name that is not lowercase words joined by -', () => {
  expect(() => moduleNames('Order')).toThrow("'Order' cannot name a module")
})
