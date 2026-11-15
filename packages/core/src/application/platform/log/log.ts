import { LogFields }    from '../../logs/log-line'
import { writeLogLine } from '../write-log-line/write-log-line'

export const log = {
  debug: (message: string, fields?: LogFields) => writeLogLine('debug', message, fields),
  info: (message: string, fields?: LogFields) => writeLogLine('info', message, fields),
  warn: (message: string, fields?: LogFields) => writeLogLine('warn', message, fields),
  error: (message: string, fields?: LogFields) => writeLogLine('error', message, fields),
}
