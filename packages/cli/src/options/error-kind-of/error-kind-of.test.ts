import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { errorKindOf } from './error-kind-of'

test('the kind given', () => {
  expect(errorKindOf('not-found')).toBe('not-found')
})

test('none, or one there is not, says which there are', () => {
  expect(() => errorKindOf(undefined)).toThrow('newt add error needs --kind, which says what HTTP answers it with: validation, unauthorized, forbidden, not-found, conflict')
  expect(() => errorKindOf('gone')).toThrow("'gone' is not a kind of error: validation")
})
