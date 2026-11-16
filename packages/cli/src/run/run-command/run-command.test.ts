import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { commandHelp } from '../../help/command-help/command-help'
import { ADD_BACKEND } from '../../testing/testing'
import { runCommand }  from './run-command'

test('runs the command with its arguments, its options and the folder', async () => {
  const output = await runCommand(ADD_BACKEND, ['apps/api', '--db', 'postgres', '--force'], '/project')
  expect(output.code).toBe(0)
  expect(JSON.parse(output.text)).toEqual({ args: ['apps/api'], options: { db: 'postgres', force: true }, cwd: '/project' })
})

test("--help and -h show the command's help instead of running it", async () => {
  for (const flag of ['--help', '-h']) {
    expect(await runCommand(ADD_BACKEND, [flag], '/project')).toEqual({ code: 0, text: commandHelp(ADD_BACKEND) })
  }
})

test("an unknown option fails and says how to get the command's help", async () => {
  const output = await runCommand(ADD_BACKEND, ['--nope'], '/project')
  expect(output.code).toBe(1)
  expect(output.text).toEndWith('Run newt add backend --help.')
})
