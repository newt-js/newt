import type { Logger }  from '../../logs/log-line'
import { unscopedLogs } from '../unscoped-logs/unscoped-logs'

export function setLogger(logger: Logger): void {
  unscopedLogs.useLogger(logger)
}
