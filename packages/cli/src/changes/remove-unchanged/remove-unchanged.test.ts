import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtempSync }     from 'node:fs'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { virtualFiles }    from '../virtual-files/virtual-files'
import { removeUnchanged } from './remove-unchanged'

const CHANGE = { action: 'remove-unchanged' as const, path: 'index.ts', content: 'hello\n', why: 'the backend starts at src/index.ts' }

async function folderWith(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-remove-'))
  await Bun.write(join(cwd, 'index.ts'), content)
  return cwd
}

describe('removeUnchanged', () => {
  test('removes the file while it is as it was made', async () => {
    const cwd = await folderWith('hello\n')
    expect(await removeUnchanged(CHANGE, virtualFiles(cwd, false))).toEqual({ status: 'removed', note: 'the backend starts at src/index.ts', warnings: [] })
    expect(await Bun.file(join(cwd, 'index.ts')).exists()).toBe(false)
  })

  test('leaves a file someone changed, and warns', async () => {
    const cwd = await folderWith('mine\n')
    expect(await removeUnchanged(CHANGE, virtualFiles(cwd, false))).toEqual({
      status: 'skipped',
      note: 'changed',
      warnings: ['index.ts was changed, so newt left it, though the backend starts at src/index.ts'],
    })
    expect(await Bun.file(join(cwd, 'index.ts')).text()).toBe('mine\n')
  })

  test('skips a file that is not there', async () => {
    expect((await removeUnchanged(CHANGE, virtualFiles(mkdtempSync(join(tmpdir(), 'newt-cli-remove-')), false))).status).toBe('skipped')
  })

  test('a dry run removes nothing', async () => {
    const cwd = await folderWith('hello\n')
    expect((await removeUnchanged(CHANGE, virtualFiles(cwd, true))).status).toBe('removed')
    expect(await Bun.file(join(cwd, 'index.ts')).exists()).toBe(true)
  })
})
