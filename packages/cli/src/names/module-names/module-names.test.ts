import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { moduleNames } from './module-names'

test("a module's names from its folder's", () => {
  expect(moduleNames('oauth-signing-key')).toEqual({
    folder: 'oauth-signing-key',
    module: 'oauthSigningKey',
    name: 'oauthSigningKey',
    type: 'OauthSigningKey',
    table: 'oauth_signing_key',
    migration: 'oauth_signing_key',
    words: 'oauth signing key',
    plural: 'oauthSigningKeys',
    path: 'oauth-signing-keys',
  })
})

test('plurals in English', () => {
  expect(['order', 'box', 'category', 'day', 'batch'].map(folder => moduleNames(folder).plural)).toEqual(['orders', 'boxes', 'categories', 'days', 'batches'])
})

test('plurals English makes otherwise, and one given', () => {
  expect(['child', 'person', 'mouse', 'quiz', 'analysis', 'news', 'sales-person'].map(folder => moduleNames(folder).path)).toEqual(['children', 'people', 'mice', 'quizzes', 'analyses', 'news', 'sales-people'])
  expect(moduleNames('cactus', 'cacti')).toMatchObject({ plural: 'cacti', path: 'cacti', table: 'cactus' })
  expect(() => moduleNames('cactus', 'Cacti')).toThrow("'Cacti' cannot be the plural of cactus")
})

test('refuses a name that is not lowercase words joined by -', () => {
  expect(() => moduleNames('Order')).toThrow("'Order' cannot name a module")
  expect(moduleNames('customer-account-statement-line').type).toBe('CustomerAccountStatementLine')
  expect(() => moduleNames('customer-account-statement-lines')).toThrow('of more than 28 characters')
  expect(() => moduleNames('sales/order')).toThrow("'sales/order' cannot name a module")
})
