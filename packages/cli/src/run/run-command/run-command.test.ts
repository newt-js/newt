import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { mkdtempSync }   from 'node:fs'
import { readdirSync }   from 'node:fs'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { defineCommand } from '../../commands/command'
import { commandHelp }   from '../../help/command-help/command-help'
import { ADD_BACKEND }   from '../../testing/fake-commands'
import { BROKEN }        from '../../testing/fake-commands'
import { runCommand }    from './run-command'

const emptyFolder = () => mkdtempSync(join(tmpdir(), 'newt-cli-run-'))

describe('runCommand', () => {
  test('runs the command with its arguments and options, in the folder, and applies its result', async () => {
    const cwd = emptyFolder()
    const output = await runCommand(ADD_BACKEND, ['api', '--db', 'postgres', '--install'], { cwd, ask: null })
    expect(output.code).toBe(0)
    expect(output.text).toContain('created  api/options.json')
    expect(await Bun.file(join(cwd, 'api/options.json')).json()).toEqual({ db: 'postgres', install: true })
  })

  test('refuses a flag given twice', async () => {
    expect(await runCommand(ADD_BACKEND, ['api', '--db', 'postgres', '--db=sqlite'], { cwd: emptyFolder(), ask: null })).toEqual({ code: 1, text: '--db is given twice: give it once', json: false })
  })

  test('--json prints the report as JSON', async () => {
    const output = await runCommand(ADD_BACKEND, ['api', '--json'], { cwd: emptyFolder(), ask: null })
    expect(JSON.parse(output.text)).toEqual({ dryRun: false, files: [{ path: 'api/options.json', status: 'created' }], warnings: [], nextSteps: ['cd api'] })
  })

  test('--dry-run writes nothing', async () => {
    const cwd = emptyFolder()
    const output = await runCommand(ADD_BACKEND, ['api', '--dry-run'], { cwd, ask: null })
    expect(output.text).toContain('will create  api/options.json')
    expect(readdirSync(cwd)).toEqual([])
  })

  test("--help and -h show the command's help instead of running it", async () => {
    for (const flag of ['--help', '-h']) {
      expect(await runCommand(ADD_BACKEND, [flag], { cwd: emptyFolder(), ask: null })).toEqual({ code: 0, text: commandHelp(ADD_BACKEND) })
    }
  })

  test("an unknown option fails and says how to get the command's help", async () => {
    const output = await runCommand(ADD_BACKEND, ['--nope'], { cwd: emptyFolder(), ask: null })
    expect(output.code).toBe(1)
    expect(output.text).toEndWith('Run newt add backend --help.')
  })

  test('a CommandError fails with its message, as text or as JSON', async () => {
    expect(await runCommand(BROKEN, [], { cwd: emptyFolder(), ask: null })).toEqual({ code: 1, text: 'It broke: fix it like this', json: false })
    const output = await runCommand(BROKEN, ['--json'], { cwd: emptyFolder(), ask: null })
    expect(output.code).toBe(1)
    expect(output.json).toBe(true)
    expect(JSON.parse(output.text)).toEqual({ error: 'It broke: fix it like this' })
  })

  test('with --json, an option it does not know fails as JSON too', async () => {
    const output = await runCommand(ADD_BACKEND, ['api', '--nope', '--json'], { cwd: emptyFolder(), ask: null })
    expect(output).toMatchObject({ code: 1, json: true })
    expect((JSON.parse(output.text) as { error: string }).error).toEndWith('Run newt add backend --help.')
  })

  test('any other error is a bug, and is not hidden', async () => {
    const crashing = defineCommand({ name: 'crash', summary: '', run: async () => { throw new TypeError('bug') } })
    await expect(runCommand(crashing, [], { cwd: emptyFolder(), ask: null })).rejects.toThrow('bug')
  })
})
