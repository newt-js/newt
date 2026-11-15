import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }   from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { noObservability } from '../../../domain/observability/no-observability/no-observability'
import { ConsoleLogger }   from '../../logs/console-logger/console-logger'
import { Platform }        from './platform'

describe('Platform', () => {
  test('logs to the console and observes nothing, unless told', () => {
    const platform = new Platform({ cluster: new MemoryCluster() })

    expect(platform.logger).toBeInstanceOf(ConsoleLogger)
    expect(platform.observability).toBe(noObservability)
  })

  test('takes another logger and observability, from the start or later', () => {
    const logger = { write: () => {} }
    const observability = { ...noObservability }
    const platform = new Platform({ cluster: new MemoryCluster(), logger })
    platform.useObservability(observability)

    expect([platform.logger, platform.observability]).toEqual([logger, observability])
  })
})
