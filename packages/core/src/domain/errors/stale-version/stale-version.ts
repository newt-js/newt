import { ConcurrencyConflict } from '../concurrency-conflict/concurrency-conflict'

export class StaleVersion extends ConcurrencyConflict {
  readonly code = 'stale_version'
  constructor() {
    super('Someone changed it in the meantime. Try again.')
  }
}
