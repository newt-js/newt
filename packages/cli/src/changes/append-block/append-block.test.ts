import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { diskFiles }    from '../../testing/disk-files/disk-files'
import { virtualFiles } from '../virtual-files/virtual-files'
import { appendBlock }  from './append-block'

async function folderWith(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-append-'))
  await Bun.write(join(cwd, 'f.ts'), content)
  return cwd
}

describe('appendBlock', () => {
  test('appends the block after a blank line', async () => {
    const cwd = await folderWith('export const a = 1\n')
    expect(await appendBlock({ action: 'append-block', path: 'f.ts', block: 'export const b = 2\nexport type B = 2', imports: [] }, diskFiles(cwd))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, 'f.ts')).text()).toBe('export const a = 1\n\nexport const b = 2\nexport type B = 2\n')
  })

  test('not when the file has its first line already', async () => {
    const cwd = await folderWith('export const b = 2\n')
    expect((await appendBlock({ action: 'append-block', path: 'f.ts', block: 'export const b = 2', imports: [] }, diskFiles(cwd))).status).toBe('skipped')
  })

  test('nor when it has it in other quotes and with a semicolon', async () => {
    const cwd = await folderWith('test("GET /sales/orders", async () => {\n  run();\n});\n')
    expect((await appendBlock({ action: 'append-block', path: 'f.ts', block: "test('GET /sales/orders', async () => {\n  run()\n})", imports: [] }, diskFiles(cwd))).status).toBe('skipped')
  })

  test('says what to add to a file that is not there', async () => {
    const outcome = await appendBlock({ action: 'append-block', path: 'f.ts', block: 'export const b = 2', imports: [] }, virtualFiles(mkdtempSync(join(tmpdir(), 'newt-cli-append-'))))
    expect(outcome.warnings).toEqual(['f.ts is not there, so newt did not add to it:\nexport const b = 2'])
  })
})
