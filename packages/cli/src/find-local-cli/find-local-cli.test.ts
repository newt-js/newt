import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { mkdirSync }     from 'node:fs'
import { mkdtempSync }   from 'node:fs'
import { realpathSync }  from 'node:fs'
import { symlinkSync }   from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { findLocalCli }  from './find-local-cli'

function projectWithCli(bin: unknown, manifest = JSON.stringify({ name: '@newt-js/cli', bin })): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-local-')))
  const cli = join(root, 'node_modules/@newt-js/cli')
  mkdirSync(join(cli, 'src'), { recursive: true })
  writeFileSync(join(cli, 'package.json'), manifest)
  for (const file of ['src/bin.ts', 'bin.ts']) writeFileSync(join(cli, file), '')
  return root
}

const pathOf = async (cwd: string) => (await findLocalCli(cwd, SELF)).path

const SELF = realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-self-')))

describe('findLocalCli', () => {
  test("finds the project's cli, from its root or any folder inside it", async () => {
    const root = projectWithCli({ newt: './src/bin.ts' })
    const deep = join(root, 'apps/backend/src')
    mkdirSync(deep, { recursive: true })
    const expected = join(root, 'node_modules/@newt-js/cli/src/bin.ts')
    expect(await pathOf(root)).toBe(expected)
    expect(await pathOf(deep)).toBe(expected)
  })

  test('takes a bin given as a single path', async () => {
    const root = projectWithCli('./bin.ts')
    expect(await pathOf(root)).toBe(join(root, 'node_modules/@newt-js/cli/bin.ts'))
  })

  test('is null outside any project with the cli', async () => {
    expect(await pathOf(realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-none-'))))).toBeNull()
  })

  test('is null when the cli found is this one, linked or not', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-linked-')))
    mkdirSync(join(root, 'node_modules/@newt-js'), { recursive: true })
    await Bun.write(join(SELF, 'package.json'), JSON.stringify({ name: '@newt-js/cli', bin: { newt: './src/bin.ts' } }))
    symlinkSync(SELF, join(root, 'node_modules/@newt-js/cli'))
    expect(await pathOf(root)).toBeNull()
  })

  test('is null when the cli found has no newt bin', async () => {
    expect(await pathOf(projectWithCli({ other: './x.ts' }))).toBeNull()
  })

  test('passes over, with a warning, a cli whose manifest is broken, whose bin is missing or outside it', async () => {
    for (const [root, why] of [
      [projectWithCli(null, '{ broken'), 'is not valid JSON'],
      [projectWithCli({ newt: './gone.ts' }), 'has no ./gone.ts'],
      [projectWithCli({ newt: '../../../evil.ts' }), 'has a bin outside its package'],
    ] as const) {
      const found = await findLocalCli(root, SELF)
      expect(found.path).toBeNull()
      expect(found.warning).toContain(why)
    }
  })
})
