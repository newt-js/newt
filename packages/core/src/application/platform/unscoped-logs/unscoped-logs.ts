import { ConsoleLogger } from '../../logs/console-logger/console-logger'
import { Logger }        from '../../logs/log-line'
import { LogTarget }     from '../log-target'

let inUse: Logger = new ConsoleLogger()

export const unscopedLogs: LogTarget = {
  get logger() {
    return inUse
  },
  useLogger(logger) {
    inUse = logger
  },
}
