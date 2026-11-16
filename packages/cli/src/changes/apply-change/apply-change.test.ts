import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { virtualFiles } from '../virtual-files/virtual-files'
import { applyChange }  from './apply-change'

test('each change goes to its kind, on the same files', async () => {
  const files = virtualFiles(mkdtempSync(join(tmpdir(), 'newt-cli-change-')))
  expect((await applyChange({ action: 'create', path: 'package.json', content: '{}\n' }, files)).status).toBe('created')
  expect((await applyChange({ action: 'complete-json', path: 'package.json', values: { name: 'shop' } }, files)).status).toBe('updated')
  expect((await applyChange({ action: 'ensure-lines', path: '.gitignore', lines: ['data'] }, files)).status).toBe('created')
  expect((await applyChange({ action: 'complete-env', path: '.env', variables: { PORT: '3000' } }, files)).status).toBe('created')
  expect(await files.read('package.json')).toBe('{"name": "shop"}\n')
})
