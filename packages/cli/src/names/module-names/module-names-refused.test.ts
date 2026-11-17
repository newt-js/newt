import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { moduleNames } from './module-names'

const REFUSED: [string, string][] = [
  ['delete', 'a word JavaScript keeps'],
  ['class', 'a word JavaScript keeps'],
  ['event', 'a name newt\'s generated code uses'],
  ['dep', 'a name newt\'s generated code uses'],
  ['router', 'a name newt\'s generated code uses'],
  ['entity', 'a name newt\'s generated code uses'],
  ['repository', 'a name newt\'s generated code uses'],
  ['page-request', 'a name newt\'s generated code uses'],
  ['http-router', 'a name newt\'s generated code uses'],
  ['context-base', 'a name newt\'s generated code uses'],
  ['use-case', 'a name newt\'s generated code uses'],
  ['newt-job', 'those tables are newt\'s own'],
  [`a${'-b'.repeat(40)}`, 'more than 63 characters'],
]

test.each(REFUSED)('refuses %s', (name, why) => {
  expect(() => moduleNames(name)).toThrow(why)
})

test('takes ordinary names', () => {
  for (const name of ['order', 'price-change', 'invoice-line']) expect(moduleNames(name).folder).toBe(name)
})
