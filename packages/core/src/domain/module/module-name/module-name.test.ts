import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { moduleNameError } from './module-name'

describe('moduleNameError', () => {
  test.each([
    ['sales.order', "write 'sales[order]'"],
    ['sales/order', "write 'sales[order]'"],
    ['sales[order_line]', "write 'sales[orderLine]'"],
    ['Sales[Order]', "write 'sales[order]'"],
    ['order', "name it after the feature it is in, '<feature>[order]', as its folders say (features/<feature>/modules/<module>)"],
  ])('says what to write instead of %s', (name, says) => {
    expect(moduleNameError(name).message).toBe(`A module is named after its feature and itself, '<feature>[<module>]' in camelCase, as 'campaigns[template]': '${name}' is not: ${says}`)
  })

  test('says only the shape when it cannot tell', () => {
    expect(moduleNameError('a.b.c').message).toEndWith("'a.b.c' is not")
  })
})
