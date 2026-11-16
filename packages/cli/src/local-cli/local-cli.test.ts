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
import { localCli }      from './local-cli'

function projectWithCli(bin: unknown): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-local-')))
  const cli = join(root, 'node_modules/@newt-js/cli')
  mkdirSync(cli, { recursive: true })
  writeFileSync(join(cli, 'package.json'), JSON.stringify({ name: '@newt-js/cli', bin }))
  return root
}

const SELF = realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-self-')))

describe('localCli', () => {
  test("finds the project's cli, from its root or any folder inside it", async () => {
    const root = projectWithCli({ newt: './src/bin.ts' })
    const deep = join(root, 'apps/backend/src')
    mkdirSync(deep, { recursive: true })
    const expected = join(root, 'node_modules/@newt-js/cli/src/bin.ts')
    expect(await localCli(root, SELF)).toBe(expected)
    expect(await localCli(deep, SELF)).toBe(expected)
  })

  test('takes a bin given as a single path', async () => {
    const root = projectWithCli('./bin.ts')
    expect(await localCli(root, SELF)).toBe(join(root, 'node_modules/@newt-js/cli/bin.ts'))
  })

  test('is null outside any project with the cli', async () => {
    expect(await localCli(realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-none-'))), SELF)).toBeNull()
  })

  test('is null when the cli found is this one, linked or not', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'newt-cli-linked-')))
    mkdirSync(join(root, 'node_modules/@newt-js'), { recursive: true })
    await Bun.write(join(SELF, 'package.json'), JSON.stringify({ name: '@newt-js/cli', bin: { newt: './src/bin.ts' } }))
    symlinkSync(SELF, join(root, 'node_modules/@newt-js/cli'))
    expect(await localCli(root, SELF)).toBeNull()
  })

  test('is null when the cli found has no newt bin', async () => {
    expect(await localCli(projectWithCli({ other: './x.ts' }), SELF)).toBeNull()
  })
})
