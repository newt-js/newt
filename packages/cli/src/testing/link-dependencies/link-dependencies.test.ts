import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdtemp }          from 'node:fs/promises'
import { realpath }         from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
// --------------------------------------------------------
import { linkDependencies } from './link-dependencies'

async function projectDependingOn(dependencies: Record<string, string>): Promise<string> {
  const folder = await realpath(await mkdtemp(join(tmpdir(), 'newt-cli-link-')))
  await Bun.write(join(folder, 'package.json'), JSON.stringify({ dependencies }))
  return folder
}

test("links the project's dependencies, scoped ones too, and can be run again", async () => {
  const folder = await projectDependingOn({ '@newt-js/core': '0.0.0', 'zod': '4.3.6' })
  await linkDependencies(folder)
  await linkDependencies(folder)
  expect((await Bun.file(join(folder, 'node_modules/@newt-js/core/package.json')).json()).name).toBe('@newt-js/core')
  expect((await Bun.file(join(folder, 'node_modules/zod/package.json')).json()).name).toBe('zod')
})

test('says what to add when the cli has not that dependency', async () => {
  const folder = await projectDependingOn({ 'left-pad': '1.0.0' })
  await expect(linkDependencies(folder)).rejects.toThrow('left-pad: add it to the devDependencies of @newt-js/cli')
})
