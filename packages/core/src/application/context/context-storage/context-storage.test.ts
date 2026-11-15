import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }       from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { MemoryDatabase }      from '../../../adapters/database/memory/memory-database/memory-database'
import { MemoryPublicStorage } from '../../../adapters/files/memory/memory-public-storage/memory-public-storage'
import { MemoryStorage }       from '../../../adapters/files/memory/memory-storage/memory-storage'
import { Platform }            from '../../platform/platform/platform'
import { ContextBase }         from '../context-base/context-base'

const platform = new Platform({ cluster: new MemoryCluster() })

const open = async (storage?: ConstructorParameters<typeof ContextBase>[0]['storage']) =>
  new ContextBase({ name: 'boards', platform, database: new MemoryDatabase(), storage })

describe('base.storage', () => {
  test('a module\'s files are under its context and its own name', async () => {
    const memory = new MemoryStorage()
    const base = await open({ private: memory })

    await base.storage.private.in('attachment').put('a', 'hello', { contentType: 'text/plain' })

    expect(await memory.stat('boards/attachment/a')).toEqual({ size: 5, contentType: 'text/plain' })
    await base.close()
  })

  test('two contexts on one place never meet', async () => {
    const memory = new MemoryStorage()
    const boards = await open({ private: memory })
    const auth = new ContextBase({ name: 'auth', platform, database: new MemoryDatabase(), storage: { private: memory } })

    await boards.storage.private.in('x').put('a', 'hello', { contentType: 'text/plain' })

    expect(await auth.storage.private.in('x').stat('a')).toBeNull()
    await boards.close()
    await auth.close()
  })

  test('public files have an address', async () => {
    const base = await open({ public: new MemoryPublicStorage() })

    expect(base.storage.public.in('avatar').url('a')).toBe('memory://public/boards/avatar/a')
    await base.close()
  })

  test('a context given none opens, and says so only when a module asks', async () => {
    const base = await open()

    expect(() => base.storage.private).toThrow("The context 'boards' was given no private storage")
    expect(() => base.storage.public).toThrow("The context 'boards' was given no public storage")
    await base.close()
  })

  test('a kind given does not make the other one up', async () => {
    const base = await open({ private: new MemoryStorage() })

    expect(() => base.storage.public).toThrow('no public storage')
    await base.close()
  })
})
