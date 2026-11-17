import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { contextNames } from './context-names'

test("a context's names from its folder's", () => {
  expect(contextNames('shop')).toEqual({ folder: 'shop', type: 'Shop', camel: 'shop', env: 'SHOP' })
  expect(contextNames('web-session')).toEqual({ folder: 'web-session', type: 'WebSession', camel: 'webSession', env: 'WEB_SESSION' })
})

test('refuses a name that is not lowercase words joined by -', () => {
  for (const name of ['Shop', 'web_session', '-shop', 'shop-', '2shop', 'web--session', '']) {
    expect(() => contextNames(name)).toThrow(`'${name}' cannot name a context`)
  }
})
