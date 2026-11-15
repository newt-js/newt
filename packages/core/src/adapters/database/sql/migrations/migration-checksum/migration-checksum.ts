import { createHash } from 'node:crypto'

export function migrationChecksum(script: string): string {
  return createHash('sha256').update(script.replaceAll('\r\n', '\n')).digest('hex')
}
