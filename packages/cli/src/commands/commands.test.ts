import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { COMMANDS } from './commands'

test('no two commands share a name', () => {
  const names = COMMANDS.map(command => command.name)
  expect(new Set(names).size).toBe(names.length)
})
