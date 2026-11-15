export type ConflictRetries = {
  times: number
  duplicates: number
  backoffMs: number
}

export const DEFAULT_CONFLICT_RETRIES: ConflictRetries = Object.freeze({ times: 3, duplicates: 1, backoffMs: 10 })

export function conflictRetries(given: Partial<ConflictRetries> | undefined): ConflictRetries {
  const defined = Object.fromEntries(Object.entries(given ?? {}).filter(([, value]) => value !== undefined))
  const retries = { ...DEFAULT_CONFLICT_RETRIES, ...defined }
  if (defined.duplicates === undefined && Number.isInteger(retries.times)) {
    retries.duplicates = Math.min(retries.duplicates, retries.times)
  }
  for (const key of ['times', 'duplicates'] as const) {
    if (!Number.isInteger(retries[key]) || retries[key] < 0) {
      throw new Error(`conflictRetries.${key} is a whole number from 0, not ${retries[key]}`)
    }
  }
  if (retries.duplicates > retries.times) {
    throw new Error(`conflictRetries.duplicates are among its times, no more than ${retries.times}, not ${retries.duplicates}`)
  }
  if (!Number.isFinite(retries.backoffMs) || retries.backoffMs < 0) {
    throw new Error(`conflictRetries.backoffMs is a number of milliseconds from 0, not ${retries.backoffMs}`)
  }
  return retries
}
