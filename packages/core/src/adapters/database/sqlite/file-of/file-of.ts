import { realpathSync } from 'node:fs'

export function fileOf(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}
