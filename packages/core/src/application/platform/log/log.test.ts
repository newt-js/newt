import { afterEach }     from 'bun:test'
import { beforeEach }    from 'bun:test'
import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { spyOn }         from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { Clock }         from '../../../domain/clock/clock'
import { UseCaseRunner } from '../../../domain/use-case/use-case-runner/use-case-runner'
import { ConsoleLogger } from '../../logs/console-logger/console-logger'
import { LogLine }       from '../../logs/log-line'
import { observedBy }    from '../observed-by/observed-by'
import { Platform }      from '../platform/platform'
import { setLogger }     from '../set-logger/set-logger'
import { unscopedLogs }  from '../unscoped-logs/unscoped-logs'
import { log }           from './log'

let previous = unscopedLogs.logger

beforeEach(() => {
  previous = unscopedLogs.logger
})

afterEach(() => {
  setLogger(previous)
})

describe('log', () => {
  test('a line goes to the logger set, whole', () => {
    const lines: LogLine[] = []
    setLogger({ write: line => void lines.push(line) })

    log.warn('odd', { n: 1 })

    expect(lines).toEqual([{ at: expect.any(String), level: 'warn', message: 'odd', fields: { n: 1 }, context: null }])
  })

  test('a line is stamped by the clock of the use case it is written in, and by the real one outside any', async () => {
    const lines: LogLine[] = []
    setLogger({ write: line => void lines.push(line) })
    let time = Date.parse('2026-01-01T00:00:00.000Z')
    const clock: Clock = { now: () => new Date(time) }
    const runner = new UseCaseRunner({ clock })

    await runner.run('order.place', async () => {
      log.info('placed')
      time += 60_000
      log.info('a minute later')
    })
    const before = Date.now()
    log.info('outside')

    expect(lines.slice(0, 2).map(line => line.at)).toEqual(['2026-01-01T00:00:00.000Z', '2026-01-01T00:01:00.000Z'])
    expect(Date.parse(lines[2]!.at)).toBeGreaterThanOrEqual(before)
  })

  test('a clock that throws, or gives no valid date, loses no line: it is stamped by the real time', async () => {
    const lines: LogLine[] = []
    setLogger({ write: line => void lines.push(line) })
    const before = Date.now()

    for (const clock of [{ now: () => {
      throw new Error('no time')
    } }, { now: () => new Date(NaN) }] as Clock[]) {
      await new UseCaseRunner({ clock }).run('order.place', async () => log.info('placed'))
    }

    expect(lines.map(line => line.message)).toEqual(['placed', 'placed'])
    expect(lines.every(line => Date.parse(line.at) >= before)).toBe(true)
  })

  test('the framework\'s own warnings go to its platform\'s logger', async () => {
    const lines: LogLine[] = []
    const platform = new Platform({ cluster: new MemoryCluster(), logger: { write: line => void lines.push(line) } })
    const runner = new UseCaseRunner({ writeRule: 'warn', observability: observedBy(platform) })

    await runner.run('order.place', () => runner.run('stock.reserve', async () => runner.checkWriteRule()))

    expect(lines).toEqual([expect.objectContaining({ level: 'warn', message: expect.stringContaining('[write rule] order.place writes to stock') })])
  })

  test('a line written in a use case says its context', async () => {
    const lines: LogLine[] = []
    setLogger({ write: line => void lines.push(line) })

    await new UseCaseRunner({ context: 'shop' }).run('order.place', async () => log.info('placed'))

    expect(lines[0]?.context).toBe('shop')
  })

  test('a line goes to the logger of the platform whose use case writes it', async () => {
    const shop: string[] = []
    const backoffice: string[] = []
    const runnerOf = (lines: string[]) => new UseCaseRunner({ observability: observedBy(new Platform({ cluster: new MemoryCluster(), logger: { write: line => void lines.push(line.message) } })) })

    await runnerOf(shop).run('order.place', async () => log.info('shop'))
    await runnerOf(backoffice).run('order.place', async () => log.info('backoffice'))

    expect([shop, backoffice]).toEqual([['shop'], ['backoffice']])
  })

  test('with no logger set, they are on the console', () => {
    setLogger(new ConsoleLogger())
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      log.warn('[Worker] something odd', { jobId: 'j-1' })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('WARN [Worker] something odd'), { jobId: 'j-1' })
    } finally {
      warn.mockRestore()
    }
  })

  test('a logger that logs while it writes does not write to itself again: that line goes to the console', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const lines: string[] = []
    setLogger({
      write: line => {
        lines.push(line.message)
        log.error('the logger is odd', { n: 1 })
      },
    })
    try {
      log.info('first')
      log.info('second')
      expect(lines).toEqual(['first', 'second'])
      expect(error).toHaveBeenCalledTimes(2)
      expect(error.mock.calls[0]).toEqual(['[log] a line (error) written while the logger wrote another: the logger is odd', { n: 1 }])
    } finally {
      error.mockRestore()
    }
  })

  test('a logger that throws costs the caller nothing: it is said on the console', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    setLogger({ write: () => {
      throw new Error('disk full')
    } })
    try {
      expect(() => log.error('boom')).not.toThrow()
      expect(error).toHaveBeenCalledWith('[log] a line could not be written:', new Error('disk full'))
    } finally {
      error.mockRestore()
    }
  })
})
