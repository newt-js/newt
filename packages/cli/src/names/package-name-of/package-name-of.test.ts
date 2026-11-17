import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { isBackendName } from '../backend-name/backend-name'
import { packageNameOf } from './package-name-of'

test('a valid name stays as it is', () => {
  expect(packageNameOf('shop-api')).toBe('shop-api')
})

test('any text becomes a valid name', () => {
  expect(packageNameOf('My Shop!')).toBe('my-shop')
  expect(packageNameOf('_Tienda Ñandú')).toBe('tienda-and')
  expect(isBackendName(packageNameOf('  ..Weird__Name  '))).toBe(true)
})

test('text with nothing to keep is backend', () => {
  expect(packageNameOf('ñ!')).toBe('backend')
})

test('always one a backend takes', () => {
  expect(packageNameOf('node_modules')).toBe('node-modules')
  expect(packageNameOf('x_')).toBe('x')
})
