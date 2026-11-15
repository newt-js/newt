import { ValidationError } from '../../../errors/validation-error/validation-error'

export class InvalidUuid extends ValidationError<{ type: string }> {
  readonly code = 'invalid_uuid'
  constructor(type: string) {
    super(`That is not a valid ${type}`, { type })
  }
}
