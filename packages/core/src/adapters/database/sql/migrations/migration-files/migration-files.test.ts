import { afterAll }       from 'bun:test'
import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { mkdtempSync }    from 'node:fs'
import { rmSync }         from 'node:fs'
import { writeFileSync }  from 'node:fs'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
// --------------------------------------------------------
import { migrationFiles } from './migration-files'

const folders: string[] = []
const folderWith = (...files: string[]) => {
  const folder = mkdtempSync(join(tmpdir(), 'newt-migration-files-'))
  folders.push(folder)
  for (const file of files) {
    writeFileSync(join(folder, file), '')
  }
  return folder
}
afterAll(() => folders.forEach(folder => rmSync(folder, { recursive: true, force: true })))

describe('migrationFiles', () => {
  test('pairs the up and down scripts of each version, in order, and leaves other files', async () => {
    const folder = folderWith('00002_b_up.sql', '00001_a_down.sql', '00001_a_up.sql', '00002_b_down.sql', 'README.md')

    expect(await migrationFiles(folder)).toEqual([
      { version: 1, name: 'a', up: join(folder, '00001_a_up.sql'), down: join(folder, '00001_a_down.sql') },
      { version: 2, name: 'b', up: join(folder, '00002_b_up.sql'), down: join(folder, '00002_b_down.sql') },
    ])
  })

  test('is none for no folder, and refuses one that is not there', async () => {
    expect(await migrationFiles(undefined)).toEqual([])
    await expect(migrationFiles(join(tmpdir(), 'newt-no-such-folder'))).rejects.toThrow('cannot be read')
  })

  test('refuses two migrations of one number, and one missing half of its pair', async () => {
    await expect(migrationFiles(folderWith('00001_a_up.sql', '00001_a_down.sql', '00001_b_up.sql', '00001_b_down.sql'))).rejects.toThrow('have the same number')
    await expect(migrationFiles(folderWith('00001_a_up.sql'))).rejects.toThrow('missing its down file')
  })

  test('refuses a migration not named as one, which would never run', async () => {
    await expect(migrationFiles(folderWith('0020_x_up.sql', '0020_x_down.sql'))).rejects.toThrow('Migration 0020_x_down.sql is not named as one, 00001_name_up.sql: it would never run')
  })
})
