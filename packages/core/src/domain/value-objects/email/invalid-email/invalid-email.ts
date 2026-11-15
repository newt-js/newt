import { ValidationError } from '../../../errors/validation-error/validation-error'

export class InvalidEmail extends ValidationError<{ email: string }> {
  readonly code = 'invalid_email'
  constructor(email: string) {
    super(`'${email}' is not a valid email`, { email })
  }
}
