import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { ADD }         from '../../testing/testing'
import { ADD_BACKEND } from '../../testing/testing'
import { INIT }        from '../../testing/testing'
import { findCommand } from './find-command'

const COMMANDS = [ADD, ADD_BACKEND, INIT]

test('finds a command by its name and leaves the rest of the arguments', () => {
  expect(findCommand(['init', '--db', 'x'], COMMANDS)).toEqual({ command: INIT, rest: ['--db', 'x'] })
})

test('the command with the most words wins', () => {
  expect(findCommand(['add', 'backend', 'apps/api'], COMMANDS)).toEqual({ command: ADD_BACKEND, rest: ['apps/api'] })
  expect(findCommand(['add', 'context'], COMMANDS)).toEqual({ command: ADD, rest: ['context'] })
})

test('words after the first option are not part of the name', () => {
  expect(findCommand(['add', '--x', 'backend'], COMMANDS)).toEqual({ command: ADD, rest: ['--x', 'backend'] })
})

test('null when no command matches', () => {
  expect(findCommand(['nope'], COMMANDS)).toBeNull()
  expect(findCommand(['--help'], COMMANDS)).toBeNull()
  expect(findCommand([], COMMANDS)).toBeNull()
})
