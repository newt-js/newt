import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { virtualFiles } from '../virtual-files/virtual-files'
import { ensureLines }  from './ensure-lines'

async function folderWith(path: string, content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-lines-'))
  await Bun.write(join(cwd, path), content)
  return cwd
}

describe('ensureLines', () => {
  test('adds at the end the lines that are missing', async () => {
    const cwd = await folderWith('.gitignore', 'node_modules\n.env\n')
    expect(await ensureLines('.gitignore', ['node_modules', 'data'], virtualFiles(cwd, false))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, '.gitignore')).text()).toBe('node_modules\n.env\ndata\n')
  })

  test('adds a line break first when the file ends without one', async () => {
    const cwd = await folderWith('CLAUDE.md', '# Rules')
    await ensureLines('CLAUDE.md', ['@AGENTS.md'], virtualFiles(cwd, false))
    expect(await Bun.file(join(cwd, 'CLAUDE.md')).text()).toBe('# Rules\n@AGENTS.md\n')
  })

  test('changes nothing when every line is there', async () => {
    const cwd = await folderWith('.gitignore', 'data\n')
    expect(await ensureLines('.gitignore', ['data'], virtualFiles(cwd, false))).toEqual({ status: 'skipped', note: 'up to date', warnings: [] })
  })

  test('creates the file when it is not there', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-lines-'))
    expect((await ensureLines('.gitignore', ['data', '.env'], virtualFiles(cwd, false))).status).toBe('created')
    expect(await Bun.file(join(cwd, '.gitignore')).text()).toBe('data\n.env\n')
  })

  test('a dry run writes nothing', async () => {
    const cwd = await folderWith('.gitignore', 'node_modules\n')
    expect((await ensureLines('.gitignore', ['data'], virtualFiles(cwd, true))).status).toBe('updated')
    expect(await Bun.file(join(cwd, '.gitignore')).text()).toBe('node_modules\n')
  })
})
