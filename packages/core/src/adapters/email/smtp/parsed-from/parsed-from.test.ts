import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { parsedFrom } from './parsed-from'

test.each([
  ['hello@shop.test', { name: '', address: 'hello@shop.test' }],
  ['Shop <hello@shop.test>', { name: 'Shop', address: 'hello@shop.test' }],
  [' "Shop, Inc." <hello@shop.test> ', { name: 'Shop, Inc.', address: 'hello@shop.test' }],
  ['<no-reply@localhost>', { name: '', address: 'no-reply@localhost' }],
  ['Shop', null],
  ['Shop <hello>', null],
  ['', null],
])('%p', (text, expected) => {
  expect(parsedFrom(text)).toEqual(expected)
})
