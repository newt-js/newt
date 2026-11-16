import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { optionsHelp } from './options-help'

test('optionsHelp lists each option with its description, aligned', () => {
  expect(optionsHelp({
    help: { type: 'boolean', short: 'h', description: 'Show this help' },
    db: { type: 'string', value: 'adapter', description: 'The database' },
  })).toEqual([
    '  -h, --help          Show this help',
    '      --db <adapter>  The database',
  ])
})
