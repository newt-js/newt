import { ConcurrencyConflict } from '../../../../../domain/errors/concurrency-conflict/concurrency-conflict'

export class TransactionConflict extends ConcurrencyConflict {
  readonly code = 'transaction_conflict'
  constructor(cause?: unknown) {
    super('Another change got in the way. Try again.')
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', { value: cause })
    }
  }
}
