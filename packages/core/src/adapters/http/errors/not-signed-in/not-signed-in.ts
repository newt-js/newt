import { UnauthorizedError } from '../../../../domain/errors/unauthorized-error/unauthorized-error'

export class NotSignedIn extends UnauthorizedError {
  readonly code = 'not_signed_in'
  constructor() {
    super('Sign in first')
  }
}
