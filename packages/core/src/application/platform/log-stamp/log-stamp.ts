import { now } from '../../../domain/clock/now/now'

export function logStamp(): string {
  try {
    return now().toISOString()
  } catch {
    return new Date().toISOString()
  }
}
