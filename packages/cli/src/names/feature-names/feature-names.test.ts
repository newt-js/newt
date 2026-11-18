import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { featureNames } from './feature-names'

test("a feature's names from its folder's", () => {
  expect(featureNames('sales-orders')).toEqual({ folder: 'sales-orders', camel: 'salesOrders', type: 'SalesOrders', table: 'sales_orders' })
  expect(featureNames('campaigns')).toEqual({ folder: 'campaigns', camel: 'campaigns', type: 'Campaigns', table: 'campaigns' })
})

test.each([
  ['Campaigns', 'lowercase words joined by -'],
  ['delete', 'a word JavaScript keeps'],
  ['router', "a name newt's generated code uses"],
  ['files', "where the context's files are served"],
  ['newt-jobs', "those tables are newt's own"],
])('refuses %s', (name, why) => {
  expect(() => featureNames(name)).toThrow(why)
})
