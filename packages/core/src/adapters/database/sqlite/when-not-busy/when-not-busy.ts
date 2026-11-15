export const BUSY_TIMEOUT_MS = 5_000

export function whenNotBusy(fn: () => void): void {
  const deadline = Date.now() + BUSY_TIMEOUT_MS
  for (;;) {
    try {
      fn()
      return
    } catch (error) {
      if ((error as { code?: unknown }).code !== 'SQLITE_BUSY' || Date.now() > deadline) {
        throw error
      }
      Bun.sleepSync(10)
    }
  }
}
