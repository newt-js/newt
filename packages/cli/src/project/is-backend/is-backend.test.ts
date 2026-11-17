import { expect }    from 'bun:test'
import { test }      from 'bun:test'
import { mkdtemp }   from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
// --------------------------------------------------------
import { isBackend } from './is-backend'

async function folderWith(manifest: unknown, backendTs = true): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'newt-cli-is-backend-'))
  if (manifest !== undefined) await Bun.write(join(folder, 'package.json'), JSON.stringify(manifest))
  if (backendTs) await Bun.write(join(folder, 'src/backend.ts'), '')
  return folder
}

test('a folder whose package.json depends on @newt-js/core, with src/backend.ts', async () => {
  expect(await isBackend(await folderWith({ dependencies: { '@newt-js/core': '1.0.0' } }))).toBe(true)
})

test('not a library that depends on @newt-js/core', async () => {
  expect(await isBackend(await folderWith({ dependencies: { '@newt-js/core': '1.0.0' } }, false))).toBe(false)
})

test('not one without it, without a package.json, or with one that is not JSON', async () => {
  expect(await isBackend(await folderWith({ dependencies: { zod: '4.0.0' } }))).toBe(false)
  expect(await isBackend(await folderWith(undefined))).toBe(false)
  const broken = await folderWith(undefined)
  await Bun.write(join(broken, 'package.json'), '{ nope')
  expect(await isBackend(broken)).toBe(false)
})
