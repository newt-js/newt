import { LogLine } from '../log-line'
import { Logger }  from '../log-line'

export class ConsoleLogger implements Logger {

  constructor(private readonly options: { debug?: boolean } = {}) {}

  write(line: LogLine): void {
    if (line.level === 'debug' && !this.options.debug) return
    const text = `${line.at} ${line.level.toUpperCase()}${line.context ? ` [${line.context}]` : ''} ${line.message}`
    const fields = Object.keys(line.fields).length > 0 ? [line.fields] : []
    if (line.level === 'error') {
      console.error(text, ...fields)
    } else if (line.level === 'warn') {
      console.warn(text, ...fields)
    } else {
      console.log(text, ...fields)
    }
  }
}
