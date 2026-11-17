import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { optionFlag } from './option-flag'

test('a boolean option with a short name', () => {
  expect(optionFlag('help', { type: 'boolean', short: 'h', description: '' })).toBe('-h, --help')
})

test('an option without a short name keeps the long names aligned', () => {
  expect(optionFlag('dry-run', { type: 'boolean', description: '' })).toBe('    --dry-run')
})

test('a string option shows its value', () => {
  expect(optionFlag('db', { type: 'string', value: 'adapter', description: '' })).toBe('    --db <adapter>')
  expect(optionFlag('name', { type: 'string', description: '' })).toBe('    --name <value>')
})
