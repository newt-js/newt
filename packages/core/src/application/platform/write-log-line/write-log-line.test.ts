import { afterEach }     from 'bun:test'
import { beforeEach }    from 'bun:test'
import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { spyOn }         from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import type { LogLine }  from '../../logs/log-line'
import { platformScope } from '../platform-scope/platform-scope'
import { Platform }      from '../platform/platform'
import { setLogger }     from '../set-logger/set-logger'
import { unscopedLogs }  from '../unscoped-logs/unscoped-logs'
import { writeLogLine }  from './write-log-line'

let previous = unscopedLogs.logger

beforeEach(() => {
  previous = unscopedLogs.logger
})

afterEach(() => {
  setLogger(previous)
})

describe('writeLogLine', () => {
  test('writes a whole line to the logger set, outside any platform or use case', () => {
    const lines: LogLine[] = []
    setLogger({ write: line => void lines.push(line) })

    writeLogLine('info', 'placed')

    expect(lines).toEqual([{ at: expect.any(String), level: 'info', message: 'placed', fields: {}, context: null }])
  })

  test('writes to the logger of the platform in scope', () => {
    const lines: string[] = []
    const platform = new Platform({ cluster: new MemoryCluster(), logger: { write: line => void lines.push(line.message) } })

    platformScope.run(platform, () => writeLogLine('warn', 'odd'))

    expect(lines).toEqual(['odd'])
  })

  test('a line written while the logger writes goes to the console, and a logger that throws costs nothing', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    setLogger({ write: line => {
      writeLogLine('error', 'inside', { n: 1 })
      throw new Error(`${line.message} failed`)
    } })
    try {
      expect(() => writeLogLine('info', 'first')).not.toThrow()
      expect(error.mock.calls).toEqual([
        ['[log] a line (error) written while the logger wrote another: inside', { n: 1 }],
        ['[log] a line could not be written:', new Error('first failed')],
      ])
    } finally {
      error.mockRestore()
    }
  })
})
