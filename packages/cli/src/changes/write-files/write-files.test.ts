import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { writeFiles }  from './write-files'

const emptyFolder = () => mkdtempSync(join(tmpdir(), 'newt-cli-write-'))

test('writes and removes each file', async () => {
  const cwd = emptyFolder()
  await Bun.write(join(cwd, 'old.txt'), 'old')
  await writeFiles(cwd, new Map([['src/a.txt', 'a'], ['old.txt', null]]), false)
  expect(await Bun.file(join(cwd, 'src/a.txt')).text()).toBe('a')
  expect(await Bun.file(join(cwd, 'old.txt')).exists()).toBe(false)
})

test('writes nothing when a file stands where a folder goes, in a dry run too', async () => {
  const cwd = emptyFolder()
  await Bun.write(join(cwd, 'src'), 'a file')
  const changed = new Map([['package.json', '{}'], ['src/index.ts', '']])
  for (const dryRun of [true, false]) {
    expect(writeFiles(cwd, changed, dryRun)).rejects.toThrow('newt wrote nothing: src is a file, so src/index.ts cannot be in it')
  }
  expect(await Bun.file(join(cwd, 'package.json')).exists()).toBe(false)
})
