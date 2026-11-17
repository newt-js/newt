import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { mkdtempSync }   from 'node:fs'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { diskFiles }     from '../../testing/disk-files/disk-files'
import { virtualFiles }  from '../virtual-files/virtual-files'
import { removeJsonKey } from './remove-json-key'

const CHANGE = { action: 'remove-json-key' as const, path: 'package.json', key: 'module', value: 'index.ts', whenMissing: 'index.ts' }

async function folderWith(files: Record<string, string>): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-key-'))
  for (const [path, content] of Object.entries(files)) await Bun.write(join(cwd, path), content)
  return cwd
}

describe('removeJsonKey', () => {
  test('removes the key once the file is gone', async () => {
    const cwd = await folderWith({ 'package.json': '{\n  "name": "shop",\n  "module": "index.ts"\n}\n' })
    expect(await removeJsonKey(CHANGE, diskFiles(cwd))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, 'package.json')).text()).toBe('{\n  "name": "shop"\n}\n')
  })

  test('keeps the key while the file is there', async () => {
    const cwd = await folderWith({ 'package.json': '{ "module": "index.ts" }', 'index.ts': '' })
    expect((await removeJsonKey(CHANGE, diskFiles(cwd))).status).toBe('skipped')
  })

  test('keeps the key when it holds another value', async () => {
    const cwd = await folderWith({ 'package.json': '{ "module": "main.ts" }' })
    expect((await removeJsonKey(CHANGE, diskFiles(cwd))).status).toBe('skipped')
    expect(await Bun.file(join(cwd, 'package.json')).json()).toEqual({ module: 'main.ts' })
  })

  test('sees a file removed earlier in a dry run', async () => {
    const cwd = await folderWith({ 'package.json': '{ "module": "index.ts" }', 'index.ts': '' })
    const files = virtualFiles(cwd)
    await files.remove('index.ts')
    expect((await removeJsonKey(CHANGE, files)).status).toBe('updated')
    expect(await Bun.file(join(cwd, 'package.json')).json()).toEqual({ module: 'index.ts' })
  })
})
