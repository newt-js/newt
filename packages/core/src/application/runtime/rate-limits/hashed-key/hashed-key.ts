import { createHash } from 'node:crypto'

export function hashedKey(context: string, key: string): string {
  return createHash('sha256').update(`${context}:${key}`).digest('hex')
}
