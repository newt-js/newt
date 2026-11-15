import { afterEach }     from 'bun:test'
import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { spyOn }         from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { LogLine }       from '../log-line'
import { ConsoleLogger } from './console-logger'

const line = (fields: Partial<LogLine>): LogLine => ({ at: '2026-01-01T00:00:00.000Z', level: 'info', message: 'placed', fields: {}, context: null, ...fields })

const spies = { log: spyOn(console, 'log'), warn: spyOn(console, 'warn'), error: spyOn(console, 'error') }

afterEach(() => {
  for (const spy of Object.values(spies)) spy.mockReset()
})

describe('ConsoleLogger', () => {
  test('writes a line with its time and level first, its context in brackets, and its fields after', () => {
    spies.log.mockImplementation(() => {})
    new ConsoleLogger().write(line({ context: 'shop', fields: { orderId: 'o-1' } }))
    expect(spies.log).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z INFO [shop] placed', { orderId: 'o-1' })
  })

  test('says nothing of the fields or the context a line has none of', () => {
    spies.log.mockImplementation(() => {})
    new ConsoleLogger().write(line({}))
    expect(spies.log).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z INFO placed')
  })

  test('writes warnings and errors where the console keeps them', () => {
    spies.warn.mockImplementation(() => {})
    spies.error.mockImplementation(() => {})
    const logger = new ConsoleLogger()
    logger.write(line({ level: 'warn', message: 'odd' }))
    logger.write(line({ level: 'error', message: 'broke' }))
    expect(spies.warn).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z WARN odd')
    expect(spies.error).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z ERROR broke')
  })

  test('writes debug lines only when asked', () => {
    spies.log.mockImplementation(() => {})
    new ConsoleLogger().write(line({ level: 'debug' }))
    expect(spies.log).not.toHaveBeenCalled()
    new ConsoleLogger({ debug: true }).write(line({ level: 'debug' }))
    expect(spies.log).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z DEBUG placed')
  })
})
