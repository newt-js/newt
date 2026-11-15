import { ValidationError } from '../../../errors/validation-error/validation-error'

export class InvalidKey extends ValidationError<{ type: string }> {
  readonly code = 'invalid_key'
  constructor(type: string) {
    super(`That is not a valid ${type}`, { type })
  }
}
