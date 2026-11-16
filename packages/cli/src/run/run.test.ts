import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { newtHelp }    from '../help/newt-help/newt-help'
import { ADD_BACKEND } from '../testing/fake-commands'
import { INIT }        from '../testing/fake-commands'
import { version }     from '../version/version'
import { run }         from './run'

const CONTEXT = { commands: [INIT, ADD_BACKEND], cwd: '/project', ask: null }

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
    expect(await run(['init'], CONTEXT)).toEqual({ code: 0, text: 'Nothing to do.', json: false })
  })

  test('a command runs in the given folder', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-run-'))
    await run(['add', 'backend', 'api'], { ...CONTEXT, cwd })
    expect(await Bun.file(join(cwd, 'api/options.json')).exists()).toBe(true)
  })

  test('an unknown command fails and says how to get help', async () => {
    expect(await run(['nope'], CONTEXT)).toEqual({ code: 1, text: "Unknown command 'nope'. Run newt --help.", json: false })
  })

  test('with --json, an unknown command or option fails as JSON', async () => {
    expect(await run(['nope', '--json'], CONTEXT)).toEqual({ code: 1, text: JSON.stringify({ error: "Unknown command 'nope'. Run newt --help." }, null, 2), json: true })
    expect(await run(['--nope', '--json'], CONTEXT)).toMatchObject({ code: 1, json: true })
  })

  test('--json and --dry-run may come before the command', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-run-'))
    const output = await run(['--json', '--dry-run', 'add', 'backend', 'api'], { ...CONTEXT, cwd })
    expect(output).toMatchObject({ code: 0, json: true })
    expect((JSON.parse(output.text) as { dryRun: boolean }).dryRun).toBe(true)
    expect(await Bun.file(join(cwd, 'api/options.json')).exists()).toBe(false)
  })

  test('with --json, the version and the help are JSON too', async () => {
    expect(JSON.parse((await run(['--version', '--json'], CONTEXT)).text)).toEqual({ version: await version() })
    expect(JSON.parse((await run(['--help', '--json'], CONTEXT)).text)).toEqual({ help: await newtHelp(CONTEXT.commands) })
  })

  test('the first word of commands alone, or with one that is not, says which there are', async () => {
    expect((await run(['add'], CONTEXT)).text).toBe('newt add takes what to add: newt add backend. Run newt --help.')
    expect((await run(['add', 'modul', 'x/y'], CONTEXT)).text).toBe("Unknown command 'add modul': newt add backend. Run newt --help.")
  })

  test('an unknown option fails and says how to get help', async () => {
    const output = await run(['--nope'], CONTEXT)
    expect(output.code).toBe(1)
    expect(output.text).toEndWith('Run newt --help.')
  })
})
