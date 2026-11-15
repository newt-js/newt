import { ConcurrencyConflict } from '../concurrency-conflict/concurrency-conflict'

export class DuplicateValue extends ConcurrencyConflict<{ fields: string[] }> {
  readonly code = 'duplicate_value'
  constructor(fields: string[] = []) {
    super(fields.length ? `There is already one with this ${fields.join(' and ')}` : 'There is already one like it', { fields })
  }
}
