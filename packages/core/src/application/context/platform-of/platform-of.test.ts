import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase } from '../../../adapters/database/memory/memory-database/memory-database'
import { MemoryCluster }  from '../../cluster/memory-cluster/memory-cluster'
import { Platform }       from '../../platform/platform/platform'
import { ContextBase }    from '../context-base/context-base'
import { platformOf }     from './platform-of'

const base = (name: string, platform: Platform) => new ContextBase({ name, platform, database: new MemoryDatabase() })
const platform = () => new Platform({ cluster: new MemoryCluster() })

describe('platformOf', () => {
  test('gives the platform every context is of', () => {
    const shared = platform()

    expect(platformOf([base('a', shared), base('b', shared)])).toBe(shared)
  })

  test('refuses contexts of two platforms, and none', () => {
    expect(() => platformOf([base('auth', platform()), base('shop', platform())])).toThrow('The contexts auth, shop are not of one platform')
    expect(() => platformOf([])).toThrow('No context was given')
  })
})
