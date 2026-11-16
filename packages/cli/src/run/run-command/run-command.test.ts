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
    const output = await runCommand(ADD_BACKEND, ['api', '--db', 'postgres', '--install'], cwd)
    expect(output.code).toBe(0)
    expect(output.text).toContain('created  api/options.json')
    expect(await Bun.file(join(cwd, 'api/options.json')).json()).toEqual({ db: 'postgres', install: true })
  })

  test('--json prints the report as JSON', async () => {
    const output = await runCommand(ADD_BACKEND, ['api', '--json'], emptyFolder())
    expect(JSON.parse(output.text)).toEqual({ dryRun: false, files: [{ path: 'api/options.json', status: 'created' }], warnings: [], nextSteps: ['cd api'] })
  })

  test('--dry-run writes nothing', async () => {
    const cwd = emptyFolder()
    const output = await runCommand(ADD_BACKEND, ['api', '--dry-run'], cwd)
    expect(output.text).toContain('will create  api/options.json')
    expect(readdirSync(cwd)).toEqual([])
  })

  test("--help and -h show the command's help instead of running it", async () => {
    for (const flag of ['--help', '-h']) {
      expect(await runCommand(ADD_BACKEND, [flag], emptyFolder())).toEqual({ code: 0, text: commandHelp(ADD_BACKEND) })
    }
  })

  test("an unknown option fails and says how to get the command's help", async () => {
    const output = await runCommand(ADD_BACKEND, ['--nope'], emptyFolder())
    expect(output.code).toBe(1)
    expect(output.text).toEndWith('Run newt add backend --help.')
  })

  test('a CommandError fails with its message, as text or as JSON', async () => {
    expect(await runCommand(BROKEN, [], emptyFolder())).toEqual({ code: 1, text: 'It broke: fix it like this' })
    const output = await runCommand(BROKEN, ['--json'], emptyFolder())
    expect(output.code).toBe(1)
    expect(JSON.parse(output.text)).toEqual({ error: 'It broke: fix it like this' })
  })

  test('any other error is a bug, and is not hidden', async () => {
    const crashing = defineCommand({ name: 'crash', summary: '', run: async () => { throw new TypeError('bug') } })
    await expect(runCommand(crashing, [], emptyFolder())).rejects.toThrow('bug')
  })
})
