import { KnownError } from '../../../../../domain/errors/known-error/known-error'

export class IdempotencyKeyReused extends KnownError {
  readonly kind = 'unprocessable'
  readonly code = 'idempotency_key_reused'
  constructor() {
    super('This Idempotency-Key was sent before with another body')
  }
}
