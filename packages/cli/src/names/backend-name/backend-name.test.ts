import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { isBackendName } from './backend-name'

test('names of a folder and a package', () => {
  for (const name of ['shop', 'my-shop', 'shop.api', 'shop2', 'a']) {
    expect(isBackendName(name)).toBe(true)
  }
})

test('names that are not', () => {
  for (const name of ['', 'Shop', 'my shop', '.shop', '_shop', '@acme/shop', 'shop/api', 'a'.repeat(215), 'node_modules', 'x.', '~', '~shop', 'shop-']) {
    expect(isBackendName(name)).toBe(false)
  }
})
