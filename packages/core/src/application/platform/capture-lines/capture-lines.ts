import type { LogLevel }  from '../../logs/log-line'
import type { LogLine }   from '../../logs/log-line'
import type { LogTarget } from '../log-target'
import { unscopedLogs }   from '../unscoped-logs/unscoped-logs'

export type CapturedLines = {
  lines: LogLine[]
  said(level: LogLevel): string[]
  
  restore(): void
}

export function captureLines(target: LogTarget = unscopedLogs): CapturedLines {
  const lines: LogLine[] = []
  const messages: Record<LogLevel, string[]> = { debug: [], info: [], warn: [], error: [] }
  const before = target.logger
  target.useLogger({
    write: line => {
      lines.push(line)
      messages[line.level].push(line.message)
    },
  })
  return { lines, said: level => messages[level], restore: () => target.useLogger(before) }
}

export async function linesOf(fn: () => unknown, target: LogTarget = unscopedLogs): Promise<LogLine[]> {
  const { lines, restore } = captureLines(target)
  try {
    await fn()
  } finally {
    restore()
  }
  return lines
}
