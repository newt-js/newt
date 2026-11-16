import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { ADD_BACKEND } from '../../testing/fake-commands'
import { INIT }        from '../../testing/fake-commands'
import { commandHelp } from './command-help'

test("commandHelp shows the command's arguments, summary and options, the options of every command included", () => {
  expect(commandHelp(ADD_BACKEND)).toBe([
    'Usage: newt add backend <folder> [options]',
    '',
    'Adds a backend',
    '',
    'Options:',
    '      --db <adapter>  The database',
    '      --install       Install dependencies',
    '      --dry-run       Show what would change, writing nothing',
    '      --json          Print the result as JSON',
    '  -h, --help          Show this help',
  ].join('\n'))
})

test('a command without options of its own still has the options of every command', () => {
  expect(commandHelp(INIT)).toEndWith([
    'Options:',
    '      --dry-run  Show what would change, writing nothing',
    '      --json     Print the result as JSON',
    '  -h, --help     Show this help',
  ].join('\n'))
})
