import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { featureNames } from '../feature-names/feature-names'
import { moduleNames }  from './module-names'

const prices = featureNames('prices')
const of = (folder: string, plural?: string) => moduleNames(prices, folder, plural)

test("a module's names from its folder's and its feature's", () => {
  expect(moduleNames(featureNames('sales-orders'), 'price-change')).toEqual({
    feature: featureNames('sales-orders'),
    folder: 'price-change',
    module: 'priceChange',
    name: 'salesOrders[priceChange]',
    type: 'PriceChange',
    table: 'sales_orders$price_change',
    migration: 'sales_orders__price_change',
    words: 'price change',
    plural: 'priceChanges',
    path: 'sales-orders/price-changes',
  })
})

test('plurals in English', () => {
  expect(['order', 'box', 'category', 'day', 'batch'].map(folder => of(folder).plural)).toEqual(['orders', 'boxes', 'categories', 'days', 'batches'])
})

test('plurals English makes otherwise, and one given', () => {
  expect(['child', 'person', 'mouse', 'quiz', 'analysis', 'news', 'sales-person'].map(folder => of(folder).path)).toEqual(['prices/children', 'prices/people', 'prices/mice', 'prices/quizzes', 'prices/analyses', 'prices/news', 'prices/sales-people'])
  expect(of('cactus', 'cacti')).toMatchObject({ plural: 'cacti', path: 'prices/cacti', table: 'prices$cactus' })
  expect(() => of('cactus', 'Cacti')).toThrow("'Cacti' cannot be the plural of cactus")
})

test("a module named file: its routes are its feature's", () => {
  expect(of('file').path).toBe('prices/files')
})

test("refuses a name that is not lowercase words joined by -, and its feature's", () => {
  expect(() => of('Order')).toThrow("'Order' cannot name a module")
  expect(() => of('prices')).toThrow("'prices' cannot name a module: it is its feature's name")
})
