import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { noObservability } from '../../../domain/observability/no-observability/no-observability'
import { MemoryCluster }   from '../../cluster/memory-cluster/memory-cluster'
import { ConsoleLogger }   from '../../logs/console-logger/console-logger'
import { Platform }        from './platform'

describe('Platform', () => {
  test('logs to the console and observes nothing, unless told', () => {
    const platform = new Platform()

    expect(platform.logger).toBeInstanceOf(ConsoleLogger)
    expect(platform.observability).toBe(noObservability)
  })

  test('keeps its shared state in an in-memory cluster, unless told', () => {
    const cluster = new MemoryCluster()

    expect(new Platform().cluster).toBeInstanceOf(MemoryCluster)
    expect(new Platform({ cluster }).cluster).toBe(cluster)
  })

  test('takes another logger and observability, from the start or later', () => {
    const logger = { write: () => {} }
    const observability = { ...noObservability }
    const platform = new Platform({ cluster: new MemoryCluster(), logger })
    platform.useObservability(observability)

    expect([platform.logger, platform.observability]).toEqual([logger, observability])
  })
})
