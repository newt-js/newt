import { useCaseChainScope } from '../../../domain/use-case/use-case-chain-scope/use-case-chain-scope'
import type { LogFields }    from '../../logs/log-line'
import type { LogLevel }     from '../../logs/log-line'
import { logStamp }          from '../log-stamp/log-stamp'
import { platformScope }     from '../platform-scope/platform-scope'
import { unscopedLogs }      from '../unscoped-logs/unscoped-logs'

let writing = false

export function writeLogLine(level: LogLevel, message: string, fields: LogFields = {}): void {
  if (writing) {
    console.error(`[log] a line (${level}) written while the logger wrote another: ${message}`, fields)
    return
  }
  const { logger } = platformScope.get() ?? unscopedLogs
  writing = true
  try {
    logger.write({ at: logStamp(), level, message, fields, context: useCaseChainScope.get()?.current.context || null })
  } catch (error) {
    console.error('[log] a line could not be written:', error)
  } finally {
    writing = false
  }
}
