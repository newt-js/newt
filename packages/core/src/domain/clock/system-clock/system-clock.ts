import type { Clock } from '../clock'

export const systemClock: Clock = { now: () => new Date() }
