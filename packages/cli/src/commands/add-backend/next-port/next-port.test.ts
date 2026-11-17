import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { DEFAULT_PORT } from '../../../options/port-of/port-of'
import { nextPort }     from './next-port'

test('the default port when none is in use', () => {
  expect(nextPort([])).toBe(DEFAULT_PORT)
})

test('ten after the highest in use', () => {
  expect(nextPort([3000])).toBe(3010)
  expect(nextPort([3020, 3000, 4310])).toBe(4320)
})
