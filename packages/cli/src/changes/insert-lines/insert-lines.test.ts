import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { virtualFiles } from '../virtual-files/virtual-files'
import { insertLines }  from './insert-lines'

const FILE = "import { a } from 'a'\n\nexport function f() {\n  const list = []\n  return list\n}\n"

const CHANGE = { action: 'insert-lines' as const, path: 'f.ts', anchor: '  return list', position: 'before' as const, lines: ['  list.push(b)'], imports: ["import { b } from 'b'"] }

async function folderWith(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-insert-'))
  await Bun.write(join(cwd, 'f.ts'), content)
  return cwd
}

describe('insertLines', () => {
  test('inserts the lines before the line, and the imports after the last import', async () => {
    const cwd = await folderWith(FILE)
    expect(await insertLines(CHANGE, virtualFiles(cwd, false))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe("import { a } from 'a'\nimport { b } from 'b'\n\nexport function f() {\n  const list = []\n  list.push(b)\n  return list\n}\n")
  })

  test('or after it', async () => {
    const cwd = await folderWith(FILE)
    await insertLines({ ...CHANGE, anchor: '  const list = []', position: 'after' }, virtualFiles(cwd, false))
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toContain('  const list = []\n  list.push(b)\n  return list')
  })

  test('the second time, nothing changes', async () => {
    const cwd = await folderWith(FILE)
    await insertLines(CHANGE, virtualFiles(cwd, false))
    expect((await insertLines(CHANGE, virtualFiles(cwd, false))).status).toBe('skipped')
  })

  test('where the line is not, changes nothing and says what to add', async () => {
    const cwd = await folderWith('export const list = []\n')
    expect(await insertLines(CHANGE, virtualFiles(cwd, false))).toEqual({
      status: 'skipped',
      note: 'not as newt wrote it',
      warnings: ["f.ts is not as newt wrote it, so newt did not change it: add import { b } from 'b'; list.push(b)"],
    })
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe('export const list = []\n')
  })

  test('a dry run writes nothing', async () => {
    const cwd = await folderWith(FILE)
    expect((await insertLines(CHANGE, virtualFiles(cwd, true))).status).toBe('updated')
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe(FILE)
  })
})
