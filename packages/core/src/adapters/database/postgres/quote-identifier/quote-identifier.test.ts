import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { quoteIdentifier } from './quote-identifier'

describe('quoteIdentifier', () => {
  test('wraps a name in double quotes and doubles the quotes inside it', () => {
    expect(quoteIdentifier('users')).toBe('"users"')
    expect(quoteIdentifier('we"ird')).toBe('"we""ird"')
  })
})
