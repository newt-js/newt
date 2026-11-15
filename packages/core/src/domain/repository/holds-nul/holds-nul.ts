import { unstorable } from '../unstorable/unstorable'

export function holdsNul(value: unknown): boolean {
  if (typeof value === 'string') {
    return unstorable(value)
  }
  if (Array.isArray(value)) {
    return value.some(holdsNul)
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Uint8Array)) {
    return Object.entries(value).some(([key, each]) => unstorable(key) || holdsNul(each))
  }
  return false
}
