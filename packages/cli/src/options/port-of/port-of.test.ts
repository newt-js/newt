import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { DEFAULT_PORT } from './port-of'
import { portOf }       from './port-of'

test('the port given', () => {
  expect(portOf('3010')).toBe(3010)
})

test('the default port when none is given', () => {
  expect(portOf(undefined)).toBe(DEFAULT_PORT)
})

test('refuses what is not a port', () => {
  for (const given of ['', 'abc', '0', '65536', '30.5', '-1']) {
    expect(() => portOf(given)).toThrow(`'${given}' is not a port`)
  }
})
