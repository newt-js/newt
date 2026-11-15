import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { log }           from '../log/log'
import { platformScope } from '../platform-scope/platform-scope'
import { Platform }      from '../platform/platform'
import { captureLines }  from './capture-lines'
import { linesOf }       from './capture-lines'

describe('captureLines', () => {
  test('keeps the lines instead of writing them, until it puts the logger back', () => {
    const platform = new Platform({ cluster: new MemoryCluster(), logger: { write: () => {} } })
    const before = platform.logger
    const captured = captureLines(platform)

    platformScope.run(platform, () => log.warn('odd'))
    captured.restore()

    expect(captured.said('warn')).toEqual(['odd'])
    expect(platform.logger).toBe(before)
  })

  test('linesOf gives the lines while a function runs', async () => {
    const lines = await linesOf(() => log.info('inside'))

    expect(lines.map(line => line.message)).toEqual(['inside'])
  })
})
