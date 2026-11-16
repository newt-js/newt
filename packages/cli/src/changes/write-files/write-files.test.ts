import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { chmodSync }   from 'node:fs'
import { existsSync }  from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { symlinkSync } from 'node:fs'
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
    await expect(writeFiles(cwd, changed, dryRun)).rejects.toThrow('newt wrote nothing: src is a file, so src/index.ts cannot be in it')
  }
  expect(await Bun.file(join(cwd, 'package.json')).exists()).toBe(false)
})

test('a file it cannot write is seen before writing, in a dry run too', async () => {
  const cwd = emptyFolder()
  await Bun.write(join(cwd, 'locked.ts'), 'mine')
  chmodSync(join(cwd, 'locked.ts'), 0o444)
  for (const dryRun of [true, false]) {
    await expect(writeFiles(cwd, new Map([['a.ts', 'a'], ['locked.ts', 'theirs']]), dryRun)).rejects.toThrow('newt wrote nothing: locked.ts cannot be written')
  }
  expect(await Bun.file(join(cwd, 'a.ts')).exists()).toBe(false)
})

test('when a write fails, what it wrote is put back', async () => {
  const cwd = emptyFolder()
  await Bun.write(join(cwd, 'kept.ts'), 'before')
  const changed = new Map([['kept.ts', 'after'], ['src/new/a.ts', 'a'], [`${'x'.repeat(300)}.ts`, 'too long']])
  await expect(writeFiles(cwd, changed, false)).rejects.toThrow('newt wrote nothing: it could not write')
  expect(await Bun.file(join(cwd, 'kept.ts')).text()).toBe('before')
  expect(existsSync(join(cwd, 'src'))).toBe(false)
})

test('writes nothing through a link out of the project, a file or a folder, nor through a link to nothing', async () => {
  const outside = emptyFolder()
  await Bun.write(join(outside, 'shared.ts'), 'export {}\n')
  const cwd = emptyFolder()
  await Bun.write(join(cwd, 'package.json'), '{}')
  symlinkSync(join(outside, 'shared.ts'), join(cwd, 'linked.ts'))
  symlinkSync(outside, join(cwd, 'src'))
  symlinkSync(join(outside, 'gone.ts'), join(cwd, 'gone.ts'))
  await expect(writeFiles(cwd, new Map([['linked.ts', 'x']]), false)).rejects.toThrow('linked.ts is a link out of the project')
  await expect(writeFiles(cwd, new Map([['src/a.ts', 'x']]), false)).rejects.toThrow('src/a.ts is a link out of the project')
  await expect(writeFiles(cwd, new Map([['gone.ts', 'x']]), false)).rejects.toThrow('gone.ts is a link to nothing')
  expect(await Bun.file(join(outside, 'shared.ts')).text()).toBe('export {}\n')
  expect(existsSync(join(outside, 'a.ts'))).toBe(false)
})

test('writes through a link that stays in the project', async () => {
  const cwd = emptyFolder()
  await Bun.write(join(cwd, 'package.json'), '{}')
  await Bun.write(join(cwd, 'real/a.ts'), '')
  symlinkSync(join(cwd, 'real'), join(cwd, 'linked'))
  await writeFiles(cwd, new Map([['linked/a.ts', 'x']]), false)
  expect(await Bun.file(join(cwd, 'real/a.ts')).text()).toBe('x')
})
