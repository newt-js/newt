import { KnownError } from '../../../errors/known-error/known-error'

export class UploadTooLarge extends KnownError<{ maxBytes: number }> {
  readonly kind = 'too_large'
  readonly code = 'upload_too_large'
  constructor(maxBytes: number) {
    super(`The file is longer than the ${maxBytes} bytes it may be`, { maxBytes })
  }
}
