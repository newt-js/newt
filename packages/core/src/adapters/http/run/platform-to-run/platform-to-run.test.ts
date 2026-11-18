import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }     from '../../../../application/cluster/memory-cluster/memory-cluster'
import { ContextBase }       from '../../../../application/context/context-base/context-base'
import { Platform }          from '../../../../application/platform/platform/platform'
import { MemoryDatabase }    from '../../../database/memory/memory-database/memory-database'
import type { ContextToRun } from '../run-contexts-options'
import { platformToRun }     from './platform-to-run'

const platform = new Platform({ cluster: new MemoryCluster() })

function contextOn(of: Platform): ContextToRun {
  const base = new ContextBase({ name: 'shop', platform: of, database: new MemoryDatabase() })
  return { context: { name: 'shop', base, start: () => {}, stopWorker: async () => {}, close: async () => {} } }
}

describe('platformToRun', () => {
  test("is the contexts' platform", () => {
    expect(platformToRun([contextOn(platform)], undefined)).toBe(platform)
  })

  test('is platformWithoutContexts when there is no context', () => {
    expect(platformToRun([], platform)).toBe(platform)
  })

  test('platformWithoutContexts, with contexts, must be theirs', () => {
    expect(platformToRun([contextOn(platform)], platform)).toBe(platform)
    expect(() => platformToRun([contextOn(platform)], new Platform({ cluster: new MemoryCluster() }))).toThrow('platformWithoutContexts is not the platform of shop')
  })

  test('without contexts nor a platform there is nothing to run on', () => {
    expect(() => platformToRun([], undefined)).toThrow('No context was given')
  })
})
