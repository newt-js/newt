import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { MODULE_NAME }     from './module-name'
import { moduleNameError } from './module-name'

describe('MODULE_NAME', () => {
  test.each(['order', 'oauthSigningKey', 'newt', 'newtban'])('takes %s', name => {
    expect(MODULE_NAME.test(name)).toBe(true)
  })

  test.each(['Order', 'order-line', 'sales[order]', 'newtOutbox'])('refuses %s', name => {
    expect(MODULE_NAME.test(name)).toBe(false)
  })
})

describe('moduleNameError', () => {
  test.each([
    ['order-line', "write 'orderLine'"],
    ['order_line', "write 'orderLine'"],
    ['OrderLine', "write 'orderLine'"],
    ['sales[order]', "write 'salesOrder'"],
    ['sales.order', "write 'salesOrder'"],
    ['newtOutbox', "newt… names newt's own tables"],
  ])('says what to write instead of %s', (name, says) => {
    expect(moduleNameError(name).message).toBe(`A module is named with one word in camelCase, as 'oauthSigningKey': '${name}' is not: ${says}`)
  })

  test('says only the shape when it cannot tell', () => {
    expect(moduleNameError('1a').message).toEndWith("'1a' is not")
  })
})
