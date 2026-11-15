export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Record<string, unknown>

export type LogLine = {
  at: string
  level: LogLevel
  message: string
  fields: LogFields
  context: string | null
}

export interface Logger {
  write(line: LogLine): void
}
