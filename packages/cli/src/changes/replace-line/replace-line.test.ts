import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { diskFiles }   from '../../testing/disk-files/disk-files'
import { replaceLine } from './replace-line'

const FILE = "import { a } from 'a'\n\nconst x = a()\n"

const CHANGE = { action: 'replace-line' as const, path: 'f.ts', line: 'const x = a()', with: 'const x = a(b)', imports: ["import { b } from 'b'"] }

async function folderWith(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-replace-'))
  await Bun.write(join(cwd, 'f.ts'), content)
  return cwd
}

describe('replaceLine', () => {
  test('replaces the line and adds its imports', async () => {
    const cwd = await folderWith(FILE)
    expect(await replaceLine(CHANGE, diskFiles(cwd))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe("import { a } from 'a'\nimport { b } from 'b'\n\nconst x = a(b)\n")
  })

  test('the second time, nothing changes', async () => {
    const cwd = await folderWith(FILE)
    await replaceLine(CHANGE, diskFiles(cwd))
    expect((await replaceLine(CHANGE, diskFiles(cwd))).status).toBe('skipped')
  })

  test('where the line is not, changes nothing and says what to write', async () => {
    const cwd = await folderWith('const x = c()\n')
    expect(await replaceLine(CHANGE, diskFiles(cwd))).toEqual({
      status: 'skipped',
      note: 'not as newt wrote it',
      failed: true,
      warnings: ["f.ts is not as newt wrote it, so newt did not change it: write import { b } from 'b'; const x = a(b)"],
    })
  })

  test('not up to date while the old line is still there', async () => {
    const cwd = await folderWith("import { b } from 'b'\nconst x = a()\nconst x = a(b)\n")
    expect((await replaceLine(CHANGE, diskFiles(cwd))).status).toBe('updated')
  })
})
