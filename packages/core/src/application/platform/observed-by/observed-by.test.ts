import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }      from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import type { Observability } from '../../../domain/observability/observability'
import type { LogLine }       from '../../logs/log-line'
import { platformScope }      from '../platform-scope/platform-scope'
import { Platform }           from '../platform/platform'
import { observedBy }         from './observed-by'

describe('observedBy', () => {
  test('runs each use case in its platform, observed by its observability', async () => {
    const calls: string[] = []
    const observability: Observability = { useCase: (call, run) => (calls.push(call.name), run({ retrying: () => {} })), warn: () => {} }
    const platform = new Platform({ cluster: new MemoryCluster(), observability })

    const seen = await observedBy(platform).useCase({ name: 'order.place', module: 'order', context: 'shop' }, async () => platformScope.get())

    expect(seen).toBe(platform)
    expect(calls).toEqual(['order.place'])
  })

  test('says a warning in its platform\'s log, and to its observability', () => {
    const lines: LogLine[] = []
    const warned: string[] = []
    const platform = new Platform({ cluster: new MemoryCluster(), logger: { write: line => void lines.push(line) }, observability: { useCase: (_, run) => run({ retrying: () => {} }), warn: message => void warned.push(message) } })

    observedBy(platform).warn('[write rule] odd', { useCase: 'order.place' })

    expect(lines.map(line => [line.level, line.message, line.fields])).toEqual([['warn', '[write rule] odd', { useCase: 'order.place' }]])
    expect(warned).toEqual(['[write rule] odd'])
  })
})
