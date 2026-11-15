import { afterEach }    from 'bun:test'
import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { realpathSync } from 'node:fs'
import { mkdtemp }      from 'node:fs/promises'
import { rm }           from 'node:fs/promises'
import { symlink }      from 'node:fs/promises'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { fileOf }       from './file-of'

const folders: string[] = []

afterEach(async () => {
  await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })))
})

describe('fileOf', () => {
  test('gives the real path of a file, so two links to it name the same file', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'newt-file-of-'))
    folders.push(folder)
    const file = join(folder, 'db.sqlite')
    await Bun.write(file, '')
    await symlink(file, join(folder, 'link.sqlite'))
    expect(fileOf(join(folder, 'link.sqlite'))).toBe(realpathSync(file))
    expect(fileOf(file)).toBe(realpathSync(file))
  })

  // -----

  test('gives the path as it came when there is no file there', () => {
    expect(fileOf('/nowhere/at/all.sqlite')).toBe('/nowhere/at/all.sqlite')
  })
})
