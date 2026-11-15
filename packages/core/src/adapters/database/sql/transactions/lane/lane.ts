export class Lane {

  private queue: Promise<void> = Promise.resolve()

  exclusive<T>(fn: () => T | Promise<T>, waitTimeoutMs: number): Promise<T> {
    let timedOut = false
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const result = new Promise<T>((ok, fail) => {
      resolve = ok
      reject = fail
    })
    const timer = setTimeout(() => {
      timedOut = true
      reject(new Error(`Waited ${waitTimeoutMs} ms for the database: a transaction holds it. If this runs inside that transaction, from code that lost it (AsyncLocalStorage.snapshot, an EventEmitter), it waits for itself.`))
    }, waitTimeoutMs)
    this.queue = this.queue.then(async () => {
      clearTimeout(timer)
      if (timedOut) {
        return
      }
      try {
        resolve(await fn())
      } catch (error) {
        reject(error)
      }
    })
    return result
  }

  async drain(): Promise<void> {
    await this.queue
  }
}
