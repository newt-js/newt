import { ValidationError } from '../../../../domain/errors/validation-error/validation-error'

export class MalformedBody extends ValidationError {
  readonly code = 'malformed_body'
  constructor(cause?: unknown) {
    super('The body cannot be read as what was asked for')
    this.cause = cause
  }
}
