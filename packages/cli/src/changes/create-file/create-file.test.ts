import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { diskFiles }   from '../../testing/disk-files/disk-files'
import { createFile }  from './create-file'

const folderWith = async (content: string | null) => {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-create-'))
  if (content !== null) await Bun.write(join(cwd, 'a.ts'), content)
  return cwd
}

const KEPT = { needs: ['start'], warning: 'it should start' }

test('creates a file that is not there', async () => {
  const cwd = await folderWith(null)
  expect(await createFile({ action: 'create', path: 'a.ts', content: 'start()\n' }, diskFiles(cwd))).toEqual({ status: 'created', warnings: [] })
  expect(await Bun.file(join(cwd, 'a.ts')).text()).toBe('start()\n')
})

test('keeps one that is there, warning when it lacks what newt needs of it', async () => {
  const change = { action: 'create' as const, path: 'a.ts', content: 'start()\n', kept: KEPT }
  expect(await createFile(change, diskFiles(await folderWith('start(1)\n')))).toEqual({ status: 'skipped', note: 'already exists', warnings: [] })
  expect((await createFile(change, diskFiles(await folderWith('mine()\n')))).warnings).toEqual(['a.ts was there already, so newt kept it: it should start'])
})

test('what it needs is found whatever its case', async () => {
  const change = { action: 'create' as const, path: 'tsconfig.json', content: '', kept: { needs: ['"bundler"'], warning: 'bundler' } }
  expect((await createFile(change, diskFiles(await folderWith('{ "moduleResolution": "Bundler" }')))).warnings).toEqual([])
})
