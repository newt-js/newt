import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { newtHelp }    from '../help/newt-help/newt-help'
import { ADD_BACKEND } from '../testing/testing'
import { INIT }        from '../testing/testing'
import { version }     from '../version/version'
import { run }         from './run'

const CONTEXT = { commands: [INIT, ADD_BACKEND], cwd: '/project' }

describe('run', () => {
  test('without a command, it shows the help', async () => {
    expect(await run([], CONTEXT)).toEqual({ code: 0, text: await newtHelp(CONTEXT.commands) })
  })

  test('--help and -h show the help', async () => {
    for (const flag of ['--help', '-h']) {
      expect(await run([flag], CONTEXT)).toEqual({ code: 0, text: await newtHelp(CONTEXT.commands) })
    }
  })

  test('--version and -v show the version', async () => {
    for (const flag of ['--version', '-v']) {
      expect(await run([flag], CONTEXT)).toEqual({ code: 0, text: await version() })
    }
  })

  test('a command in the list shows in the help and runs', async () => {
    expect((await run([], CONTEXT)).text).toContain('init')
    expect(await run(['init'], CONTEXT)).toEqual({ code: 0, text: 'Nothing to do.' })
  })

  test('a command runs in the given folder', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-run-'))
    await run(['add', 'backend', 'api'], { ...CONTEXT, cwd })
    expect(await Bun.file(join(cwd, 'api/options.json')).exists()).toBe(true)
  })

  test('an unknown command fails and says how to get help', async () => {
    expect(await run(['nope'], CONTEXT)).toEqual({ code: 1, text: "Unknown command 'nope'. Run newt --help." })
  })

  test('an unknown option fails and says how to get help', async () => {
    const output = await run(['--nope'], CONTEXT)
    expect(output.code).toBe(1)
    expect(output.text).toEndWith('Run newt --help.')
  })
})
