import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { mkdtemp }        from 'node:fs/promises'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { generate }       from '../../testing/generate/generate'
import { INIT }           from './init'

const emptyFolder = () => mkdtemp(join(tmpdir(), 'newt-cli-init-'))

describe('newt init', () => {
  test('creates the backend in a folder of its name, whose lint, types and tests pass', async () => {
    const folder = join(await generate(INIT, ['shop']), 'shop')
    expect((await Bun.file(join(folder, 'package.json')).json()).name).toBe('shop')
    expect(await checkGenerated(folder)).toEqual([])
  }, 30_000)

  test('with ., in this folder, named after it', async () => {
    const folder = await generate(INIT, ['.'])
    expect((await Bun.file(join(folder, 'package.json')).json()).name).toStartWith('newt-cli-generated-')
  })

  test('run again, it changes nothing', async () => {
    const folder = await generate(INIT, ['shop'])
    const before = await Bun.file(join(folder, 'shop/package.json')).text()
    const output = await runCommand(INIT, ['shop', '--port', '4000', '--json'], { cwd: folder, ask: null })
    const report = JSON.parse(output.text) as { files: { status: string }[] }
    expect(report.files.length).toBeGreaterThan(0)
    expect(report.files.every(file => file.status === 'skipped')).toBe(true)
    expect(await Bun.file(join(folder, 'shop/package.json')).text()).toBe(before)
  })

  test('serves on the port told', async () => {
    const folder = await generate(INIT, ['shop', '--port', '3010'])
    expect(await Bun.file(join(folder, 'shop/.env')).text()).toBe('PORT=3010\n')
  })

  test('says what to do next, from the folder it was run in', async () => {
    const named = await runCommand(INIT, ['shop', '--dry-run'], { cwd: await emptyFolder(), ask: null })
    expect(named.text).toEndWith('Next steps:\n  cd shop\n  bun install\n  bun run dev')
    const here = await runCommand(INIT, ['.', '--dry-run'], { cwd: await emptyFolder(), ask: null })
    expect(here.text).toEndWith('Next steps:\n  bun install\n  bun run dev')
  })

  test('asks for the name in a terminal, and never with --json', async () => {
    const asked = await runCommand(INIT, ['--dry-run'], { cwd: await emptyFolder(), ask: async () => 'shop' })
    expect(asked.text).toContain('will create  shop/package.json')
    const json = await runCommand(INIT, ['--json'], { cwd: await emptyFolder(), ask: async () => 'shop' })
    expect(json.code).toBe(1)
    expect(JSON.parse(json.text).error).toStartWith("newt init needs the backend's name")
  })
})
