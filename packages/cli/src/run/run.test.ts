import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { run }      from './run'
import { version }  from './version/version'

describe('run', () => {
  test('without a command, it shows the help', async () => {
    const output = await run([])
    expect(output.code).toBe(0)
    expect(output.text).toContain('Usage: newt <command> [options]')
  })

  test('--help and -h show the help', async () => {
    for (const flag of ['--help', '-h']) {
      expect((await run([flag])).text).toContain('Usage: newt')
    }
  })

  test('--version and -v show the version', async () => {
    const expected = await version()
    for (const flag of ['--version', '-v']) {
      expect(await run([flag])).toEqual({ code: 0, text: expected })
    }
  })

  test('an unknown command fails and says how to get help', async () => {
    expect(await run(['nope'])).toEqual({ code: 1, text: "Unknown command 'nope'. Run newt --help." })
  })

  test('an unknown option fails and says how to get help', async () => {
    const output = await run(['--nope'])
    expect(output.code).toBe(1)
    expect(output.text).toEndWith('Run newt --help.')
  })
})
