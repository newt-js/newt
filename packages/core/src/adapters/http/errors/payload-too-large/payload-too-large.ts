import { KnownError } from '../../../../domain/errors/known-error/known-error'

export class PayloadTooLarge extends KnownError<{ maxBytes: number }> {
  readonly kind = 'too_large'
  readonly code = 'payload_too_large'
  constructor(maxBytes: number) {
    super(`The body is longer than the ${maxBytes} bytes it may be`, { maxBytes })
  }
}
