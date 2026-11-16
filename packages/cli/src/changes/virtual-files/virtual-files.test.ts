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
    const files = virtualFiles(cwd)
    expect(await files.read('a.txt')).toBe('a')
    expect(await files.read('b.txt')).toBeNull()
  })

  test('reads back what it wrote and removed, without touching the disk', async () => {
    const cwd = emptyFolder()
    await Bun.write(join(cwd, 'a.txt'), 'a')
    const files = virtualFiles(cwd)
    await files.write('b.txt', 'b')
    await files.remove('a.txt')
    expect(await files.read('b.txt')).toBe('b')
    expect(await files.read('a.txt')).toBeNull()
    expect(await Bun.file(join(cwd, 'b.txt')).exists()).toBe(false)
    expect(await Bun.file(join(cwd, 'a.txt')).exists()).toBe(true)
  })

  test('remembers what changed, in the order it last changed', async () => {
    const files = virtualFiles(emptyFolder())
    await files.write('a.txt', 'a')
    await files.write('b.txt', 'b')
    await files.write('a.txt', 'a2')
    expect([...files.changed()]).toEqual([['b.txt', 'b'], ['a.txt', 'a2']])
  })
})
