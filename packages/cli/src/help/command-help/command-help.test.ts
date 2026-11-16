import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { ADD_BACKEND } from '../../testing/testing'
import { INIT }        from '../../testing/testing'
import { commandHelp } from './command-help'

test("commandHelp shows the command's arguments, summary and options, help included", () => {
  expect(commandHelp(ADD_BACKEND)).toBe([
    'Usage: newt add backend <folder> [options]',
    '',
    'Adds a backend',
    '',
    'Options:',
    '      --db <adapter>  The database',
    '      --force         Overwrite',
    '  -h, --help          Show this help',
  ].join('\n'))
})

test('a command without options still has help', () => {
  expect(commandHelp(INIT)).toEndWith('Options:\n  -h, --help  Show this help')
})
