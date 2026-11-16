import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { virtualFiles } from './virtual-files'

const emptyFolder = () => mkdtempSync(join(tmpdir(), 'newt-cli-virtual-'))

describe('virtualFiles', () => {
  test('reads what is on disk, and null for what is not', async () => {
    const cwd = emptyFolder()
    await Bun.write(join(cwd, 'a.txt'), 'a')
    const files = virtualFiles(cwd, false)
    expect(await files.read('a.txt')).toBe('a')
    expect(await files.read('b.txt')).toBeNull()
  })

  test('writes to disk', async () => {
    const cwd = emptyFolder()
    await virtualFiles(cwd, false).write('src/a.txt', 'a')
    expect(await Bun.file(join(cwd, 'src/a.txt')).text()).toBe('a')
  })

  test('in a dry run, reads back what it wrote without writing it', async () => {
    const cwd = emptyFolder()
    const files = virtualFiles(cwd, true)
    await files.write('a.txt', 'a')
    expect(await files.read('a.txt')).toBe('a')
    expect(await Bun.file(join(cwd, 'a.txt')).exists()).toBe(false)
  })

  test('removes from disk, and in a dry run only remembers it', async () => {
    const cwd = emptyFolder()
    await Bun.write(join(cwd, 'a.txt'), 'a')
    const dry = virtualFiles(cwd, true)
    await dry.remove('a.txt')
    expect(await dry.read('a.txt')).toBeNull()
    expect(await Bun.file(join(cwd, 'a.txt')).exists()).toBe(true)
    await virtualFiles(cwd, false).remove('a.txt')
    expect(await Bun.file(join(cwd, 'a.txt')).exists()).toBe(false)
  })
})
