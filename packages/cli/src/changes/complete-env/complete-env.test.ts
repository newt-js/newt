import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { diskFiles }   from '../../testing/disk-files/disk-files'
import { completeEnv } from './complete-env'

async function folderWith(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-env-'))
  await Bun.write(join(cwd, '.env'), content)
  return cwd
}

describe('completeEnv', () => {
  test('adds the variables it does not define', async () => {
    const cwd = await folderWith('PORT=3000\n')
    expect(await completeEnv('.env', { SHOP_DATABASE: 'data/databases/shop/shop.sqlite' }, diskFiles(cwd))).toEqual({ status: 'updated', warnings: [] })
    expect(await Bun.file(join(cwd, '.env')).text()).toBe('PORT=3000\nSHOP_DATABASE=data/databases/shop/shop.sqlite\n')
  })

  test('never changes a value it has, even another one', async () => {
    const cwd = await folderWith('SHOP_DATABASE=/var/shop.sqlite\nexport PORT = 4000\n')
    expect((await completeEnv('.env', { SHOP_DATABASE: 'data/databases/shop/shop.sqlite', PORT: '3000' }, diskFiles(cwd))).status).toBe('skipped')
    expect(await Bun.file(join(cwd, '.env')).text()).toBe('SHOP_DATABASE=/var/shop.sqlite\nexport PORT = 4000\n')
  })

  test('creates the file when it is not there', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-env-'))
    expect((await completeEnv('.env.test', { SHOP_DATABASE: ':memory:' }, diskFiles(cwd))).status).toBe('created')
    expect(await Bun.file(join(cwd, '.env.test')).text()).toBe('SHOP_DATABASE=:memory:\n')
  })
})
