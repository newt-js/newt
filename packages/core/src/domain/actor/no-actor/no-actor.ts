import { UnauthorizedError } from '../../errors/unauthorized-error/unauthorized-error'

export class NoActor extends UnauthorizedError {
  readonly code = 'not_signed_in'
  constructor() {
    super('Sign in to continue')
  }
}
