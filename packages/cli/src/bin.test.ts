import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdirSync }    from 'node:fs'
import { mkdtempSync }  from 'node:fs'
import { realpathSync } from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'

const BIN = join(import.meta.dir, 'bin.ts')

async function runNewt(args: string[], cwd: string, env: Record<string, string> = {}) {
  const child = Bun.spawn([process.execPath, BIN, ...args], { cwd, stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NEWT_CLI_DELEGATED: '', ...env } })
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { code, stdout, stderr }
}

const emptyFolder = () => realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-bin-')))

async function projectWithItsOwnCli(): Promise<string> {
  const root = emptyFolder()
  const cli = join(root, 'node_modules/@newt-js/cli')
  mkdirSync(cli, { recursive: true })
  await Bun.write(join(cli, 'package.json'), JSON.stringify({ name: '@newt-js/cli', bin: { newt: './bin.ts' } }))
  await Bun.write(join(cli, 'bin.ts'), "console.log(['local', process.env.NEWT_CLI_DELEGATED, ...Bun.argv.slice(2)].join(' '))\nprocess.exit(3)\n")
  return root
}

describe('newt', () => {
  test('prints the help to stdout and exits with 0', async () => {
    const { code, stdout } = await runNewt(['--help'], emptyFolder())
    expect(code).toBe(0)
    expect(stdout).toContain('Usage: newt <command> [options]')
  })

  test('prints an error to stderr and exits with 1', async () => {
    const { code, stdout, stderr } = await runNewt(['nope'], emptyFolder())
    expect(code).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain("Unknown command 'nope'")
  })

  test("hands over to the project's own cli, with the arguments, and exits with its code", async () => {
    const { code, stdout } = await runNewt(['init', '--help'], await projectWithItsOwnCli())
    expect(code).toBe(3)
    expect(stdout.trim()).toBe('local 1 init --help')
  })

  test('once handed over, it never hands over again', async () => {
    const { code, stdout } = await runNewt(['--help'], await projectWithItsOwnCli(), { NEWT_CLI_DELEGATED: '1' })
    expect(code).toBe(0)
    expect(stdout).toContain('Usage: newt')
  })
})
