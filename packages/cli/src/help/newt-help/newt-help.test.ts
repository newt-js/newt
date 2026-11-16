import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { ADD_BACKEND } from '../../testing/testing'
import { INIT }        from '../../testing/testing'
import { version }     from '../../version/version'
import { newtHelp }    from './newt-help'

test('newtHelp starts with the version and lists the global options', async () => {
  const text = await newtHelp([])
  expect(text).toStartWith(`newt ${await version()}`)
  expect(text).toContain('-h, --help')
  expect(text).toContain('-v, --version')
})

test('newtHelp without commands has no commands section', async () => {
  expect(await newtHelp([])).not.toContain('Commands:')
})

test('newtHelp lists the commands sorted by name, with their arguments and summary', async () => {
  const text = await newtHelp([INIT, ADD_BACKEND])
  expect(text).toContain([
    'Commands:',
    '  add backend <folder>  Adds a backend',
    '  init                  Sets up a project',
  ].join('\n'))
  expect(text).toEndWith("Run newt <command> --help to see a command's options.")
})
