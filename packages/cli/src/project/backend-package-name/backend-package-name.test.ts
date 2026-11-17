import { expect }             from 'bun:test'
import { test }               from 'bun:test'
import { mkdtemp }            from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { basename }           from 'node:path'
import { join }               from 'node:path'
// --------------------------------------------------------
import { backendPackageName } from './backend-package-name'

test('the name of its package, without its scope', async () => {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-package-'))
  await Bun.write(join(backend, 'package.json'), '{ "name": "@acme/shop" }')
  expect(await backendPackageName(backend)).toBe('shop')
})

test("its folder's name without a package name", async () => {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-package-'))
  expect(await backendPackageName(backend)).toBe(basename(backend))
})
