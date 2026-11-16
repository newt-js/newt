import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { diskFiles }    from '../../testing/disk-files/disk-files'
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
    expect(await insertLines(CHANGE, diskFiles(cwd))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe("import { a } from 'a'\nimport { b } from 'b'\n\nexport function f() {\n  const list = []\n  list.push(b)\n  return list\n}\n")
  })

  test('or after it', async () => {
    const cwd = await folderWith(FILE)
    await insertLines({ ...CHANGE, anchor: '  const list = []', position: 'after' }, diskFiles(cwd))
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toContain('  const list = []\n  list.push(b)\n  return list')
  })

  test('the second time, nothing changes', async () => {
    const cwd = await folderWith(FILE)
    await insertLines(CHANGE, diskFiles(cwd))
    expect((await insertLines(CHANGE, diskFiles(cwd))).status).toBe('skipped')
  })

  test('where the line is not, changes nothing and says what to add', async () => {
    const cwd = await folderWith('export const list = []\n')
    expect(await insertLines(CHANGE, diskFiles(cwd))).toEqual({
      status: 'skipped',
      note: 'not as newt wrote it',
      failed: true,
      warnings: ["f.ts is not as newt wrote it, so newt did not change it: add import { b } from 'b'; list.push(b)"],
    })
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe('export const list = []\n')
  })

  test('a dry run writes nothing', async () => {
    const cwd = await folderWith(FILE)
    expect((await insertLines(CHANGE, virtualFiles(cwd))).status).toBe('updated')
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe(FILE)
  })

  test('a block whose lines are elsewhere in the file is inserted whole', async () => {
    const cwd = await folderWith('function f() {\n  return list\n}\n')
    const block = { ...CHANGE, imports: [], anchor: 'function f() {', position: 'after' as const, lines: ['  g()', '}', 'function h() {'] }
    expect((await insertLines(block, diskFiles(cwd))).status).toBe('updated')
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe('function f() {\n  g()\n}\nfunction h() {\n  return list\n}\n')
    expect((await insertLines(block, diskFiles(cwd))).status).toBe('skipped')
  })

  test('adds an import after a multi-line import, and not one the file has under another shape', async () => {
    const cwd = await folderWith("import {\n  a,\n  b,\n} from 'a'\n\nexport function f() {\n  const list = []\n  return list\n}\n")
    await insertLines({ ...CHANGE, imports: ["import { b } from 'a'", "import { c } from 'c'"] }, diskFiles(cwd))
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toStartWith("import {\n  a,\n  b,\n} from 'a'\nimport { c } from 'c'\n")
  })
})
