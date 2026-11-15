import { ConflictError } from '../../../../../domain/errors/conflict-error/conflict-error'

export class IdempotencyKeyInUse extends ConflictError {
  readonly code = 'idempotency_key_in_use'
  constructor() {
    super('Another request with this Idempotency-Key is still in progress')
  }
}
