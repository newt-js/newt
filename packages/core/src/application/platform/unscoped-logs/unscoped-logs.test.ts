import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { ConsoleLogger } from '../../logs/console-logger/console-logger'
import { unscopedLogs }  from './unscoped-logs'

describe('unscopedLogs', () => {
  test('logs to the console, unless told another logger', () => {
    const before = unscopedLogs.logger
    const logger = { write: () => {} }

    expect(before).toBeInstanceOf(ConsoleLogger)
    unscopedLogs.useLogger(logger)
    expect(unscopedLogs.logger).toBe(logger)
    unscopedLogs.useLogger(before)
  })
})
