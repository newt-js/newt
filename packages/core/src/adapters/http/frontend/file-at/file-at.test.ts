import { afterAll }  from 'bun:test'
import { beforeAll } from 'bun:test'
import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
import { mkdtemp }   from 'node:fs/promises'
import { rm }        from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
// --------------------------------------------------------
import { fileAt }    from './file-at'

let folder: string

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'newt-file-at-'))
  await Bun.write(join(folder, 'assets/a b.js'), 'spaced')
})

afterAll(() => rm(folder, { recursive: true }))

describe('fileAt', () => {
  test('the file a path names in the folder, written encoded too', async () => {
    expect(await (await fileAt(folder, '/assets/a%20b.js'))!.text()).toBe('spaced')
  })

  test('none for the folder itself, a file it does not have, or a path that leaves it, has a NUL or does not decode', async () => {
    for (const path of ['/', '/missing.js', '/../x', '/..%2fx', '/a%00b', '/%E0%A4%A']) {
      expect(await fileAt(folder, path)).toBeNull()
    }
  })
})
