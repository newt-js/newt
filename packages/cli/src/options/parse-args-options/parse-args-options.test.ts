import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { parseArgsOptions } from './parse-args-options'

test('parseArgsOptions keeps only what parseArgs reads', () => {
  expect(parseArgsOptions({
    help: { type: 'boolean', short: 'h', description: 'Show this help' },
    db: { type: 'string', value: 'adapter', description: 'The database' },
  })).toEqual({ help: { type: 'boolean', short: 'h' }, db: { type: 'string' } })
})
