import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { checkedName } from './checked-name'

test('a name that can name a folder and a package', () => {
  expect(checkedName('shop')).toBe('shop')
})

test('refuses one that cannot, saying one that would', () => {
  expect(() => checkedName('My Shop')).toThrow("'My Shop' cannot name a folder and a package: use lowercase letters, digits and - . _ ~, as in 'my-shop'")
})
